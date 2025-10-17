import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {FeedbackData, GeminiAnalysis} from './types';
import {analyzeFeedback} from './services/geminiService';
import Header from './components/Header';
import Rating from './components/Rating';
import FormField from './components/FormField';
import SubmitButton from './components/SubmitButton';
import CameraCapture from './components/CameraCapture';
import TropicalFishIcon from './components/icons/TropicalFishIcon';
import CrabIcon from './components/icons/CrabIcon';
import {sendToChat} from "@/sendToChatBrowser.ts";

import { TABLES_MAP } from './tables-map.js';
import ReactCountryFlag from "react-country-flag";
import { useI18n } from './I18nProvider';


const App: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const { lang, setLang, t } = useI18n();
    const [formData, setFormData] = useState<FeedbackData>({
        foodQuality: 0,
        service: 0,
        ambiance: 0,
        recommend: null,
        comments: '',
        visitDate: new Date().toISOString().split('T')[0],
        phoneNumber: '',
        receiptImage: null,
        foodComplaint: '',
        serviceComplaint: '',
        ambianceComplaint: '',
        branchId: '',
        branchName: '',
        branchAddress: '',
        tableId: '',
        tableName: '',
        tableType: '',
    });

    const [branchLockedFromQuery, setBranchLockedFromQuery] = useState(false);
    const [tableLockedFromQuery, setTableLockedFromQuery] = useState(false);

    const BRANCHES = useMemo(() => {
        const map = new Map<number, {branchId: number; branchName: string; branchAddress: string}>();
        Object.values(TABLES_MAP).forEach((t: any) => {
            if (!map.has(t.branchId)) {
                map.set(t.branchId, {
                    branchId: t.branchId,
                    branchName: t.branchName,
                    branchAddress: t.branchAddress,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.branchId - b.branchId);
    }, []);

    const TABLES_BY_BRANCH = useMemo(() => {
        const by = new Map<number, {tableId: number; tableName: string; tableType: string}[]>();
        Object.values(TABLES_MAP).forEach((t: any) => {
            const arr = by.get(t.branchId) || [];
            if (!arr.find(x => x.tableId === t.tableId)) {
                arr.push({ tableId: t.tableId, tableName: t.tableName, tableType: t.tableType });
            }
            by.set(t.branchId, arr.sort((a, b) => a.tableId - b.tableId));
        });
        return by;
    }, []);

    const [language, setLanguage] = useState("vi");

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tidStr = e.target.value;
        if (!tidStr || !formData.branchId) {
            setFormData(prev => ({ ...prev, tableId: undefined, tableName: undefined, tableType: undefined, roomNumber: '' }));
            return;
        }
        const tableId = Number(tidStr);
        const list = TABLES_BY_BRANCH.get(formData.branchId) || [];
        const t = list.find(x => x.tableId === tableId);
        if (!t) return;

        setFormData(prev => ({
            ...prev,
            tableId: t.tableId,
            tableName: t.tableName,
            tableType: t.tableType,
            roomNumber: t.tableName, // auto điền tên bàn xuống "Phòng số"
        }));
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const branchIdStr = e.target.value;

        // Người dùng thao tác bằng tay → bỏ lock
        setBranchLockedFromQuery(false);
        // Khi đổi chi nhánh thủ công, phòng cũng không còn lock từ URL
        setTableLockedFromQuery(false);

        if (!branchIdStr) {
            setFormData(prev => ({
                ...prev,
                branchId: undefined,
                branchName: undefined,
                branchAddress: '',
                tableId: undefined,
                tableName: undefined,
                tableType: undefined,
                roomNumber: '',
            }));
            return;
        }

        const branchId = Number(branchIdStr);
        const b = BRANCHES.find(x => x.branchId === branchId);
        if (!b) return;

        setFormData(prev => ({
            ...prev,
            branchId: b.branchId,
            branchName: b.branchName,
            branchAddress: b.branchAddress,
            // reset phòng khi đổi chi nhánh
            tableId: undefined,
            tableName: undefined,
            tableType: undefined,
            roomNumber: '',
        }));
    };


    function getIdFromUrl(): string | null {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('id');
        if (q) return q;
        const h = window.location.hash?.replace('#', '');
        return h || null;
    }

    useEffect(() => {
        const id = getIdFromUrl();
        if (!id) return;
        const t = TABLES_MAP[id];
        if (!t) {
            console.log("❌ Không tìm thấy bàn:", id);
            return;
        }

        console.log(`📍 Chi nhánh ${t.branchId}: ${t.branchName}`);
        console.log(`🏠 Địa chỉ: ${t.branchAddress}`);
        console.log(`🪑 Bàn ${t.tableId}: ${t.tableName} (${t.tableType})`);

        setFormData(prev => ({
            ...prev,
            branchId: t.branchId,
            branchName: t.branchName,
            branchAddress: t.branchAddress,
            tableId: t.tableId,
            tableName: t.tableName,
            tableType: t.tableType,
        }));

        // 🔒 đánh dấu là dữ liệu đến từ URL
        setBranchLockedFromQuery(true);
        setTableLockedFromQuery(true);
    }, []);

    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!formData.receiptImage) {
            setReceiptPreview(null);
            return;
        }
        const url = URL.createObjectURL(formData.receiptImage);
        setReceiptPreview(url);
        return () => URL.revokeObjectURL(url); // cleanup tránh leak
    }, [formData.receiptImage]);

    const formatBytes = (b?: number) => {
        if (!b || b <= 0) return '';
        const u = ['B','KB','MB','GB']; let i=0; let n=b;
        while (n >= 1024 && i < u.length-1) { n/=1024; i++; }
        return `${n.toFixed(1)} ${u[i]}`;
    };
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const aquariumCreatures = useMemo(() => {
        const creatures = [];
        // Add 5 tropical fish
        for (let i = 0; i < 5; i++) {
            const size = 30 + Math.random() * 40; // Smaller size: 30px to 70px
            creatures.push({
                id: `fish-${i}`, Component: TropicalFishIcon, style: {
                    top: `${10 + Math.random() * 70}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    animationName: Math.random() > 0.5 ? 'swim' : 'swim-reverse',
                    animationDuration: `${20 + Math.random() * 20}s`,
                    animationDelay: `${3 + Math.random() * 27}s`, // Start after 3s
                    animationFillMode: 'backwards',
                    animationIterationCount: 'infinite',
                    opacity: 0.7 + Math.random() * 0.3,
                }
            });
        }
        // Add 2 crabs
        for (let i = 0; i < 2; i++) {
            const size = 40 + Math.random() * 30; // Smaller size: 40px to 70px
            creatures.push({
                id: `crab-${i}`, Component: CrabIcon, style: {
                    width: `${size}px`,
                    height: `${size}px`,
                    animationName: Math.random() > 0.5 ? 'scuttle' : 'scuttle-reverse',
                    animationDuration: `${25 + Math.random() * 20}s`,
                    animationDelay: `${3.5 + Math.random() * 21.5}s`, // Start after 3.5s
                    animationFillMode: 'backwards',
                    animationIterationCount: 'infinite',
                    opacity: 0.8 + Math.random() * 0.2,
                }
            });
        }
        return creatures;
    }, []);

    const handleRatingChange = (category: keyof FeedbackData, value: number) => {
        setFormData((prev) => {
            const next = {...prev, [category]: value};
            const anyPositive = (next.foodQuality >= 3) || (next.service >= 3) || (next.ambiance >= 3);
            return {...next, recommend: anyPositive ? true : next.recommend};
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };


    const handleFileSelect = (file: File | null) => {
        if (!file) {
            setFormData(prev => ({...prev, receiptImage: null}));
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError("Kích thước tệp không được vượt quá 5MB.");
            return;
        }
        setError(null);
        setFormData((prev) => ({...prev, receiptImage: file}));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handlePhotoTaken = (file: File) => {
        handleFileSelect(file);
        setShowCamera(false);
    };

    const nextStep = () => {
        setError(null);
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = await analyzeFeedback(formData);
            setAnalysis(result);
            sendToChat(formData, result).catch(console.error);
            setIsSubmitted(true);
        } catch (err) {
            setError('Đã xảy ra lỗi khi gửi phản hồi. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [formData]);

    const resetForm = () => {
        setFormData({
            foodQuality: 0,
            service: 0,
            ambiance: 0,
            recommend: null,
            visitDate: new Date().toISOString().split('T')[0],
            phoneNumber: '',
            receiptImage: null,
            foodComplaint: '',
            serviceComplaint: '',
            ambianceComplaint: '',
        });
        setIsSubmitted(false);
        setAnalysis(null);
        setError(null);
        setCurrentStep(0);
    }

    const renderStepIndicator = () => (<div className="mb-6">
        <p className="text-center text-sm font-semibold text-orange-700"> {t('stepOf', { n: currentStep })}</p>
        <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1">
            <div className="bg-orange-600 h-1.5 rounded-full" style={{width: `${(currentStep / 2) * 100}%`}}></div>
        </div>
    </div>);

    return (<div className="min-h-screen bg-stone-100 font-sans">
        <Header/>
        {showCamera && (<CameraCapture
            onCapture={handlePhotoTaken}
            onClose={() => setShowCamera(false)}
        />)}
        <main className="p-4 max-w-md mx-auto" style={{marginTop: '-3rem'}}>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-4 border-white" style={{position: 'relative', zIndex: 1}}>
                {!isSubmitted ? (<>
                    {currentStep === 0 && (<div
                        className="relative text-center flex flex-col items-center justify-center min-h-[550px] overflow-hidden p-8 bg-slate-900" style={{position: 'relative', zIndex: 999}}>
                        <div className="absolute inset-0 z-0">
                            {aquariumCreatures.map(creature => (<creature.Component
                                key={creature.id}
                                className="absolute"
                                style={creature.style}
                            />))}
                        </div>

                        {/* Bubbles rising in the foreground */}
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            {[...Array(15)].map((_, i) => (
                                <div key={i} className="absolute bottom-0 rounded-full bg-yellow-400/20"
                                     style={{
                                         left: `${Math.random() * 100}%`,
                                         width: `${2 + Math.random() * 4}px`,
                                         height: `${2 + Math.random() * 4}px`,
                                         animation: `bubble ${5 + Math.random() * 8}s linear infinite`,
                                         animationDelay: `${Math.random() * 10}s`
                                     }}></div>))}
                        </div>

                        <div className="relative z-10 flex flex-col items-center w-full">
                            <div
                                className="w-40 h-40 rounded-full bg-yellow-500 flex items-center justify-center animate-stamp-in shadow-2xl"
                                style={{boxShadow: '0 0 25px rgba(250, 204, 21, 0.4), 0 0 10px rgba(0,0,0,0.5) inset'}}>
                                <img src="/logo.png" alt="Gold One Logo" className="w-24 h-24"
                                     style={{filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'}}/>
                            </div>

                            <div className="animate-fade-in animation-delay-500">
                                <h2 className="text-3xl font-bold text-white mt-8">
                                    {t('heroTitle')}
                                </h2>
                                <p className="text-stone-300 mt-4 mb-8 max-w-sm">
                                    {t('heroDesc')}
                                </p>
                            </div>

                            <div className="mt-4 gap-3">
                                {/* Chọn ngôn ngữ */}
                                <div className="w-full">
                                    {/* Label mô tả */}
                                    <label
                                        htmlFor="Language"
                                        className="block text-stone-700 font-medium mb-1 text-white"
                                    >
                                        🌐 {t('Language')}
                                    </label>

                                    <div className="flex items-center gap-2 w-full">
                                        <select
                                            id="language"
                                            name="language"
                                            value={lang}
                                            onChange={(e) => setLang(e.target.value as any)}
                                            className="w-full border border-stone-300 rounded-lg px-3 py-2 bg-white text-stone-700 focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="vi">🇻🇳 Tiếng Việt</option>
                                            <option value="zh">🇨🇳 中文</option>
                                            <option value="en">🇺🇸 English</option>
                                            <option value="ja">🇯🇵 日本語</option>
                                            <option value="ko">🇰🇷 한국어</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Nút gửi ý kiến */}
                                <button
                                    onClick={nextStep}
                                    className="flex-1 bg-yellow-500 mt-4 text-stone-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-400/50 animate-fade-in animation-delay-700 border-2 border-yellow-600/50"
                                >
                                    {t('ctaSealAndSend')}
                                </button>
                            </div>
                        </div>
                    </div>)}
                    {currentStep > 0 && (<form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <h2 className="text-2xl font-bold text-stone-800 text-center">
                            {t('shareYourExp')}
                        </h2>
                        <p className="text-center text-stone-500 -mt-4">
                            {t('helpUsImprove')}
                        </p>

                        {renderStepIndicator()}

                        {currentStep === 1 && (
                            <div className="space-y-6 animate-form-item">
                                {/* Món ăn */}
                                <FormField label={t('foodQuality')}>
                                    <Rating
                                        rating={formData.foodQuality}
                                        onRatingChange={(value) => handleRatingChange('foodQuality', value)}
                                    />
                                </FormField>

                                {formData.foodQuality > 0 && formData.foodQuality <= 2 && (
                                    <div className="animate-form-item">
                                        <FormField label={t('foodNegativePrompt')}>
          <textarea
              name="foodComplaint"
              rows={3}
              value={formData.foodComplaint}
              onChange={handleInputChange}
              placeholder={t('phFoodNegative')}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
          />
                                        </FormField>
                                    </div>
                                )}

                                {formData.foodQuality >= 3 && (
                                    <div className="animate-form-item">
                                        <FormField label={t('foodPositivePrompt')}>
          <textarea
              name="foodComplaint"
              rows={3}
              value={formData.foodComplaint}
              onChange={handleInputChange}
              placeholder={t('phFoodPositive')}
              className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-amber-50/30 placeholder-orange-600 placeholder:font-semibold placeholder:tracking-wide"
          />
                                        </FormField>
                                    </div>
                                )}

                                {/* Phục vụ */}
                                <FormField label={t('serviceQuality')}>
                                    <Rating
                                        rating={formData.service}
                                        onRatingChange={(value) => handleRatingChange('service', value)}
                                    />
                                </FormField>

                                {formData.service > 0 && formData.service <= 2 && (
                                    <div className="animate-form-item">
                                        <FormField label={t('serviceNegativePrompt')}>
          <textarea
              name="serviceComplaint"
              rows={3}
              value={formData.serviceComplaint}
              onChange={handleInputChange}
              placeholder={t('phServiceNegative')}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus-border-orange-500 transition"
          />
                                        </FormField>
                                    </div>
                                )}

                                {formData.service >= 3 && (
                                    <div className="animate-form-item">
                                        <FormField label={t('servicePositivePrompt')}>
          <textarea
              name="serviceComplaint"
              rows={3}
              value={formData.serviceComplaint}
              onChange={handleInputChange}
              placeholder={t('phServicePositive')}
              className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-amber-50/30 placeholder-orange-600 placeholder:font-semibold placeholder:tracking-wide"
          />
                                        </FormField>
                                    </div>
                                )}

                                {/* Không gian */}
                                <FormField label={t('ambiance')}>
                                    <Rating
                                        rating={formData.ambiance}
                                        onRatingChange={(value) => handleRatingChange('ambiance', value)}
                                    />
                                </FormField>

                                {formData.ambiance > 0 && formData.ambiance <= 2 && (
                                    <div className="animate-form-item">
                                        <FormField label={t('ambianceNegativePrompt')}>
          <textarea
              name="ambianceComplaint"
              rows={3}
              value={formData.ambianceComplaint}
              onChange={handleInputChange}
              placeholder={t('phAmbianceNegative')}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
          />
                                        </FormField>
                                    </div>
                                )}

                                {formData.ambiance >= 3 && (
                                    <div className="animate-form-item">
                                        <FormField label={t('ambiancePositivePrompt')}>
          <textarea
              name="ambianceComplaint"
              rows={3}
              value={formData.ambianceComplaint}
              onChange={handleInputChange}
              placeholder={t('phAmbiancePositive')}
              className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-amber-50/30 placeholder-orange-600 placeholder:font-semibold placeholder:tracking-wide"
          />
                                        </FormField>
                                    </div>
                                )}
                            </div>
                        )}



                        {currentStep === 2 && (
                            <div className="space-y-6 animate-form-item">
                                <div>
                                    <h3 className="text-lg font-semibold text-stone-800 mb-3">
                                        {t('visitInfo')}
                                    </h3>

                                    <FormField
                                        label={
                                            branchLockedFromQuery
                                                ? (
                                                    <>
                                                        {t('currentBranch')}{' '}
                                                        <span className="text-emerald-600 font-semibold">
              {formData.branchName}
            </span>{' '}
                                                        <span className="text-stone-600">— {formData.branchAddress}</span>
                                                    </>
                                                )
                                                : t('branch')  // khi KHÔNG lock: chỉ hiện "Chi nhánh"
                                        }
                                    >
                                        {branchLockedFromQuery ? (
                                            // 🔒 ĐÃ lock từ URL → hidden fields, không cho chọn lại
                                            <>
                                                <input type="hidden" name="branchId" value={formData.branchId ?? ''} />
                                                <input type="hidden" name="branchName" value={formData.branchName ?? ''} />
                                                <input type="hidden" name="branchAddress" value={formData.branchAddress ?? ''} />
                                            </>
                                        ) : (
                                            <select
                                                name="branchId"
                                                value={formData.branchId ?? ''}
                                                onChange={handleBranchChange}
                                                className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white"
                                            >
                                                <option value="">{t('selectBranch')}</option>
                                                {BRANCHES.map((b) => (
                                                    <option key={b.branchId} value={b.branchId}>
                                                        {b.branchName} — {b.branchAddress}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </FormField>


                                    {formData.branchId && (
                                        <FormField
                                            label={
                                                tableLockedFromQuery && formData.tableName
                                                    ? (
                                                        <>
                                                            {t('currentRoom')}{' '}
                                                            <span className="text-amber-600 font-semibold">{formData.tableName}</span>{' '}
                                                            <span className="text-stone-600">({formData.tableType || t('unknownType')})</span>
                                                        </>
                                                    )
                                                    : t('room') // khi KHÔNG lock hoặc chưa có phòng từ query → chỉ hiển thị "Phòng/Bàn"
                                            }
                                        >
                                            {tableLockedFromQuery && formData.tableName ? (
                                                <>
                                                    <input type="hidden" name="tableId" value={formData.tableId ?? ''} />
                                                    <input type="hidden" name="tableName" value={formData.tableName ?? ''} />
                                                    <input type="hidden" name="tableType" value={formData.tableType ?? ''} />
                                                </>
                                            ) : (
                                                <div className="mt-2"></div>
                                                <input
                                                    type="text"
                                                    name="tableName"
                                                    value={formData.tableName ?? ''}
                                                    onChange={(e) =>
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            tableName: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={t('enterRoomName') || 'Nhập tên phòng/bàn'}
                                                    className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-white"
                                                />
                                            )}
                                        </FormField>
                                    )}

                                    {/* Ngày ghé thăm */}
                                    <FormField
                                        label={
                                            formData.visitDate ? (
                                                <>
                                                    {t('currentVisitDate')}{' '}
                                                    <span className="text-blue-600 font-semibold">
                {new Date(formData.visitDate).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
              </span>
                                                </>
                                            ) : (
                                                `${t('currentVisitDate')} ${t('unknown')}`
                                            )
                                        }
                                    >
                                        <input
                                            type="hidden"
                                            name="visitDate"
                                            value={formData.visitDate ?? new Date().toISOString().split('T')[0]}
                                        />
                                    </FormField>
                                </div>

                                <hr className="border-stone-200" />

                                {/* Thông tin bổ sung */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-stone-800">
                                        {t('additionalInfo') || 'Thông tin bổ sung'}
                                    </h3>

                                    {/* Số điện thoại */}
                                    <FormField label={t('phoneNumber')}>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handleInputChange}
                                            placeholder={
                                                t('phonePlaceholder') ||
                                                'Để chúng tôi có thể liên hệ lại'
                                            }
                                            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                        />
                                    </FormField>

                                    {/* Đính kèm hóa đơn */}
                                    <FormField label={t('attachReceipt')}>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2"
                                            >
                                                <i className="fa-solid fa-upload"></i>
                                                <span>{t('uploadImage')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowCamera(true)}
                                                className="flex-1 cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2"
                                            >
                                                <i className="fa-solid fa-camera"></i>
                                                <span>{t('takePhoto')}</span>
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                id="receipt-upload"
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/png, image/jpeg"
                                            />
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2 text-center">
                                            {t('maxSize')}
                                        </p>

                                        {/* Hiển thị ảnh */}
                                        {formData.receiptImage && (
                                            <div className="mt-4 flex items-center justify-between bg-stone-100 p-3 rounded-lg">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => receiptPreview && window.open(receiptPreview, '_blank')}
                                                        className="relative w-16 h-16 rounded-md border border-stone-300 overflow-hidden flex-shrink-0 hover:opacity-90"
                                                        title={t('previewImage') || 'Nhấn để xem lớn'}
                                                    >
                                                        {receiptPreview ? (
                                                            <img
                                                                src={receiptPreview}
                                                                alt="Hóa đơn đã chọn"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <i className="fa-solid fa-image text-stone-400 text-xl w-full h-full flex items-center justify-center" />
                                                        )}
                                                    </button>

                                                    <div className="min-w-0">
                                                        <div className="text-sm text-stone-800 font-medium truncate">
                                                            {formData.receiptImage.name}
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            {formatBytes(formData.receiptImage.size)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Xóa ảnh */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleFileSelect(null)}
                                                    className="text-red-500 hover:text-red-700 ml-2"
                                                    title={t('delete') || 'Xóa ảnh'}
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </FormField>
                                </div>
                            </div>
                        )}


                        {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</p>}

                        <div className="pt-4 flex items-center gap-4">
                            {currentStep > 1 && (<button type="button" onClick={prevStep}
                                                         className="w-1/3 bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-lg hover:bg-stone-300 transition duration-300">
                                {t('back')}
                            </button>)}
                            {currentStep < 2 && (<button type="button" onClick={nextStep}
                                                         className="flex-1 bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition duration-300">
                                {t('next')}
                            </button>)}
                            {currentStep === 2 && (<div className="flex-1">
                                <SubmitButton isLoading={isLoading} disabled={isLoading}/>
                            </div>)}
                        </div>

                    </form>)}
                </>) : (<div className="p-8 text-center animate-fade-in">
                    <div
                        className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-5 border-4 border-emerald-200">
                        <i className="fa-solid fa-envelope-circle-check text-4xl text-emerald-600"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-stone-800">{t('sentSuccessTitle')}</h2>
                    <p className="text-stone-600 mt-3 mb-6 max-w-xs mx-auto">
                        {t('sentSuccessDesc')}
                    </p>
                </div>)}
            </div>
            <footer className="text-center py-6 text-stone-500 text-xs">
                <p>&copy; {new Date().getFullYear()} Goldone. All Rights Reserved.</p>
            </footer>
        </main>
        <style>{`
        @keyframes fade-slide-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-form-item {
            animation: fade-slide-in 0.5s ease-out forwards;
        }
        @keyframes stamp-in {
            0% { transform: scale(0.8); opacity: 0; }
            60% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-stamp-in {
            animation: stamp-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          opacity: 0;
          animation: fade-in 0.6s ease-out forwards;
        }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-700 { animation-delay: 0.7s; }

        @keyframes swim {
            0% { transform: translateX(-100px) translateY(20px) rotate(-5deg); }
            50% { transform: translateX(225px) translateY(-20px) rotate(5deg); }
            100% { transform: translateX(550px) translateY(20px) rotate(-5deg); }
        }
        @keyframes swim-reverse {
            0% { transform: translateX(550px) translateY(-20px) rotate(5deg) scaleX(-1); }
            50% { transform: translateX(225px) translateY(20px) rotate(-5deg) scaleX(-1); }
            100% { transform: translateX(-100px) translateY(-20px) rotate(5deg) scaleX(-1); }
        }
        @keyframes scuttle {
            0% { transform: translateX(-100px) scaleX(1); bottom: 5%; }
            48% { transform: translateX(215px) scaleX(1); }
            52% { transform: translateX(235px) scaleX(-1); }
            100% { transform: translateX(550px) scaleX(-1); bottom: 5%; }
        }
        @keyframes scuttle-reverse {
            0% { transform: translateX(550px) scaleX(-1); bottom: 2%; }
            48% { transform: translateX(235px) scaleX(-1); }
            52% { transform: translateX(215px) scaleX(1); }
            100% { transform: translateX(-100px) scaleX(1); bottom: 2%; }
        }
        @keyframes bubble {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-150px); opacity: 0; }
        }
      `}</style>
    </div>);
};


export default App;