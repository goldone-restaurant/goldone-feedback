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
        wechatId: '',
        email: '',
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
        userLanguage: lang,
    });

    const [branchLockedFromQuery, setBranchLockedFromQuery] = useState(false);
    const [tableLockedFromQuery, setTableLockedFromQuery] = useState(false);
    const todayStr = new Date().toISOString().split('T')[0];

    const [cooldownLeftMin, setCooldownLeftMin] = useState<number>(0);
    const [cooldownActive, setCooldownActive] = useState<boolean>(false);

    const getQuery = (k: string) => new URLSearchParams(window.location.search).get(k);

    useEffect(() => {
        // Nếu URL có ?thanks=1 (do Worker 302) → show cảm ơn ngay
        const thanks = getQuery('thanks');
        const retry = Number(getQuery('retry_after') || 0);
        if (thanks === '1') {
            setIsSubmitted(true);
            if (retry > 0) {
                setCooldownActive(true);
                setCooldownLeftMin(retry);
            }
        }

        // Dù có query hay không, vẫn hỏi Worker để chắc chắn trạng thái cooldown
        (async () => {
            try {
                const res = await fetch('/api/cooldown', { credentials: 'include' });
                const data = await res.json();
                if (data?.active) {
                    setCooldownActive(true);
                    setCooldownLeftMin(data.retry_after || 0);
                    setIsSubmitted(true); // chuyển sang view cảm ơn
                } else {
                    setCooldownActive(false);
                    // isSubmitted giữ nguyên (false) để hiện form
                }
            } catch (e) {
                console.warn('Cooldown check failed', e);
            }
        })();
    }, []);

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
            roomNumber: t.tableName,
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
        setFormData(prev => ({ ...prev, userLanguage: lang }));
    }, [lang]);

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
            // 1) Gọi Worker để “đóng dấu” (hoặc bị 429 nếu đang cooldown)
            const res = await fetch('/api/submit', { method: 'POST', credentials: 'include' });

            if (res.status === 429) {
                const j = await res.json().catch(() => ({}));
                const retry = Number(j?.retry_after || 0);
                setCooldownActive(true);
                setCooldownLeftMin(retry);
                setIsSubmitted(true); // chuyển view cảm ơn
                setError(`Bạn đã gửi gần đây. Vui lòng quay lại sau ~${retry} phút.`);
                return; // ❌ không chạy tiếp
            }

            if (!res.ok) {
                setError('Gửi thất bại. Vui lòng thử lại.');
                return;
            }

            // 2) Nếu server OK → mới chạy các bước tốn thời gian phía client
            const result = await analyzeFeedback(formData);
            setAnalysis(result);
            sendToChat(formData, result).catch(console.error);

            setIsSubmitted(true); // ✅ màn cảm ơn
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

                            <div className="gap-3">
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

                                    <div className="mt-2"></div>

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
                                                    : t('room')
                                            }
                                        >
                                            {tableLockedFromQuery && formData.tableName ? (
                                                <>
                                                    <input type="hidden" name="tableId" value={formData.tableId ?? ''} />
                                                    <input type="hidden" name="tableName" value={formData.tableName ?? ''} />
                                                    <input type="hidden" name="tableType" value={formData.tableType ?? ''} />
                                                </>
                                            ) : (
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

                                    <div className="mt-2"></div>

                                    <FormField
                                        label={
                                            branchLockedFromQuery && formData.visitDate
                                                ? (
                                                    <>
                                                        {t('currentVisitDate')}{' '}
                                                        <span className="text-blue-600 font-semibold">
              {new Date(formData.visitDate).toLocaleDateString(
                  lang === 'vi' ? 'vi-VN' : 'en-US'
              )}
            </span>
                                                    </>
                                                )
                                                : t('visitDate') // Khi không lock → chỉ hiện "Ngày bạn ghé thăm"
                                        }
                                    >
                                        {branchLockedFromQuery ? (
                                            // 🔒 Lấy từ query → khóa, chỉ gửi hidden
                                            <input
                                                type="hidden"
                                                name="visitDate"
                                                value={formData.visitDate || todayStr}
                                            />
                                        ) : (
                                            // ✅ Không lock → cho chọn ngày, tối đa là hôm nay
                                            <input
                                                type="date"
                                                name="visitDate"
                                                value={formData.visitDate || todayStr}
                                                max={todayStr}                 // ⛔ không cho chọn ngày tương lai
                                                onChange={(e) =>
                                                    setFormData(prev => ({ ...prev, visitDate: e.target.value }))
                                                }
                                                className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                            />
                                        )}
                                    </FormField>



                                </div>

                                <hr className="border-stone-200" />

                                {/* Thông tin bổ sung */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-stone-800">
                                        {t('additionalInfo') || 'Thông tin bổ sung'}
                                    </h3>

                                    {/* Liên hệ theo ngôn ngữ */}
                                    {lang === 'vi' ? (
                                        // 🇻🇳 Việt Nam → Phone
                                        <FormField label={t('phoneNumber')}>
                                            <div className="flex items-center border border-stone-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 transition bg-white">
                                                {/* Zalo SVG */}
                                                <svg
                                                    className="w-5 h-5 ml-3 shrink-0"
                                                    viewBox="0 0 460.1 436.6"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    aria-hidden="true"
                                                    focusable="false"
                                                >
                                                    <style>
                                                        {`.st0{fill:#fdfefe}.st1{fill:#0180c7}.st2{fill:#0172b1}.st3{fill:none;stroke:#0180c7;stroke-width:2;stroke-miterlimit:10}`}
                                                    </style>
                                                    <path className="st0" d="M82.6 380.9c-1.8-.8-3.1-1.7-1-3.5 1.3-1 2.7-1.9 4.1-2.8 13.1-8.5 25.4-17.8 33.5-31.5 6.8-11.4 5.7-18.1-2.8-26.5C69 269.2 48.2 212.5 58.6 145.5 64.5 107.7 81.8 75 107 46.6c15.2-17.2 33.3-31.1 53.1-42.7 1.2-.7 2.9-.9 3.1-2.7-.4-1-1.1-.7-1.7-.7-33.7 0-67.4-.7-101 .2C28.3 1.7.5 26.6.6 62.3c.2 104.3 0 208.6 0 313 0 32.4 24.7 59.5 57 60.7 27.3 1.1 54.6.2 82 .1 2 .1 4 .2 6 .2H290c36 0 72 .2 108 0 33.4 0 60.5-27 60.5-60.3v-.6-58.5c0-1.4.5-2.9-.4-4.4-1.8.1-2.5 1.6-3.5 2.6-19.4 19.5-42.3 35.2-67.4 46.3-61.5 27.1-124.1 29-187.6 7.2-5.5-2-11.5-2.2-17.2-.8-8.4 2.1-16.7 4.6-25 7.1-24.4 7.6-49.3 11-74.8 6zm72.5-168.5c1.7-2.2 2.6-3.5 3.6-4.8 13.1-16.6 26.2-33.2 39.3-49.9 3.8-4.8 7.6-9.7 10-15.5 2.8-6.6-.2-12.8-7-15.2-3-.9-6.2-1.3-9.4-1.1-17.8-.1-35.7-.1-53.5 0-2.5 0-5 .3-7.4.9-5.6 1.4-9 7.1-7.6 12.8 1 3.8 4 6.8 7.8 7.7 2.4.6 4.9.9 7.4.8 10.8.1 21.7 0 32.5.1 1.2 0 2.7-.8 3.6 1-.9 1.2-1.8 2.4-2.7 3.5-15.5 19.6-30.9 39.3-46.4 58.9-3.8 4.9-5.8 10.3-3 16.3s8.5 7.1 14.3 7.5c4.6.3 9.3.1 14 .1 16.2 0 32.3.1 48.5-.1 8.6-.1 13.2-5.3 12.3-13.3-.7-6.3-5-9.6-13-9.7-14.1-.1-28.2 0-43.3 0zm116-52.6c-12.5-10.9-26.3-11.6-39.8-3.6-16.4 9.6-22.4 25.3-20.4 43.5 1.9 17 9.3 30.9 27.1 36.6 11.1 3.6 21.4 2.3 30.5-5.1 2.4-1.9 3.1-1.5 4.8.6 3.3 4.2 9 5.8 14 3.9 5-1.5 8.3-6.1 8.3-11.3.1-20 .2-40 0-60-.1-8-7.6-13.1-15.4-11.5-4.3.9-6.7 3.8-9.1 6.9zm69.3 37.1c-.4 25 20.3 43.9 46.3 41.3 23.9-2.4 39.4-20.3 38.6-45.6-.8-25-19.4-42.1-44.9-41.3-23.9.7-40.8 19.9-40 45.6zm-8.8-19.9c0-15.7.1-31.3 0-47 0-8-5.1-13-12.7-12.9-7.4.1-12.3 5.1-12.4 12.8-.1 4.7 0 9.3 0 14v79.5c0 6.2 3.8 11.6 8.8 12.9 6.9 1.9 14-2.2 15.8-9.1.3-1.2.5-2.4.4-3.7.2-15.5.1-31 .1-46.5z"/>
                                                    <path className="st1" d="M139.5 436.2c-27.3 0-54.7.9-82-.1-32.3-1.3-57-28.4-57-60.7 0-104.3.2-208.6 0-313C.5 26.7 28.4 1.8 60.5.9c33.6-.9 67.3-.2 101-.2.6 0 1.4-.3 1.7.7-.2 1.8-2 2-3.1 2.7-19.8 11.6-37.9 25.5-53.1 42.7-25.1 28.4-42.5 61-48.4 98.9-10.4 66.9 10.5 123.7 57.8 171.1 8.4 8.5 9.5 15.1 2.8 26.5-8.1 13.7-20.4 23-33.5 31.5-1.4.8-2.8 1.8-4.2 2.7-2.1 1.8-.8 2.7 1 3.5.4.9.9 1.7 1.5 2.5 11.5 10.2 22.4 21.1 33.7 31.5 5.3 4.9 10.6 10 15.7 15.1 2.1 1.9 5.6 2.5 6.1 6.1z"/>
                                                    <path className="st2" d="M139.5 436.2c-.5-3.5-4-4.1-6.1-6.2-5.1-5.2-10.4-10.2-15.7-15.1-11.3-10.4-22.2-21.3-33.7-31.5-.6-.8-1.1-1.6-1.5-2.5 25.5 5 50.4 1.6 74.9-5.9 8.3-2.5 16.6-5 25-7.1 5.7-1.5 11.7-1.2 17.2.8 63.4 21.8 126 19.8 187.6-7.2 25.1-11.1 48-26.7 67.4-46.2 1-1 1.7-2.5 3.5-2.6.9 1.4.4 2.9.4 4.4v58.5c.2 33.4-26.6 60.6-60 60.9h-.5c-36 .2-72 0-108 0H145.5c-2-.2-4-.3-6-.3z"/>
                                                    <path className="st1" d="M155.1 212.4c15.1 0 29.3-.1 43.4 0 7.9.1 12.2 3.4 13 9.7.9 7.9-3.7 13.2-12.3 13.3-16.2.2-32.3.1-48.5.1-4.7 0-9.3.2-14-.1-5.8-.3-11.5-1.5-14.3-7.5s-.8-11.4 3-16.3c15.4-19.6 30.9-39.3 46.4-58.9.9-1.2 1.8-2.4 2.7-3.5-1-1.7-2.4-.9-3.6-1-10.8-.1-21.7 0-32.5-.1-2.5 0-5-.3-7.4-.8-5.7-1.3-9.2-7-7.9-12.6.9-3.8 3.9-6.9 7.7-7.8 2.4-.6 4.9-.9 7.4-.9 17.8-.1 35.7-.1 53.5 0 3.2-.1 6.3.3 9.4 1.1 6.8 2.3 9.7 8.6 7 15.2-2.4 5.7-6.2 10.6-10 15.5-13.1 16.7-26.2 33.3-39.3 49.8-1.1 1.3-2.1 2.6-3.7 4.8z"/>
                                                    <path className="st1" d="M271.1 159.8c2.4-3.1 4.9-6 9-6.8 7.9-1.6 15.3 3.5 15.4 11.5.3 20 .2 40 0 60 0 5.2-3.4 9.8-8.3 11.3-5 1.9-10.7.4-14-3.9-1.7-2.1-2.4-2.5-4.8-.6-9.1 7.4-19.4 8.7-30.5 5.1-17.8-5.8-25.1-19.7-27.1-36.6-2.1-18.3 4-33.9 20.4-43.5 13.6-8.1 27.4-7.4 39.9 3.5zm-35.4 36.5c.2 4.4 1.6 8.6 4.2 12.1 5.4 7.2 15.7 8.7 23 3.3 1.2-.9 2.3-2 3.3-3.3 5.6-7.6 5.6-20.1 0-27.7-2.8-3.9-7.2-6.2-11.9-6.3-11-.7-18.7 7.8-18.6 21.9zM340.4 196.9c-.8-25.7 16.1-44.9 40.1-45.6 25.5-.8 44.1 16.3 44.9 41.3.8 25.3-14.7 43.2-38.6 45.6-26.1 2.6-46.8-16.3-46.4-41.3zm25.1-2.4c-.2 5 1.3 9.9 4.3 14 5.5 7.2 15.8 8.6 23 3 1.1-.8 2-1.8 2.9-2.8 5.8-7.6 5.8-20.4.1-28-2.8-3.8-7.2-6.2-11.9-6.3-10.8-.6-18.4 7.6-18.4 20.1zM331.6 177c0 15.5.1 31 0 46.5.1 7.1-5.5 13-12.6 13.2-1.2 0-2.5-.1-3.7-.4-5-1.3-8.8-6.6-8.8-12.9v-79.5c0-4.7-.1-9.3 0-14 .1-7.7 5-12.7 12.4-12.7 7.6-.1 12.7 4.9 12.7 12.9.1 15.6 0 31.3 0 46.9z"/>
                                                    <path className="st0" d="M235.7 196.3c-.1-14.1 7.6-22.6 18.5-22 4.7.2 9.1 2.5 11.9 6.4 5.6 7.5 5.6 20.1 0 27.7-5.4 7.2-15.7 8.7-23 3.3-1.2-.9-2.3-2-3.3-3.3-2.5-3.5-3.9-7.7-4.1-12.1zM365.5 194.5c0-12.4 7.6-20.7 18.4-20.1 4.7.1 9.1 2.5 11.9 6.3 5.7 7.6 5.7 20.5-.1 28-5.6 7.1-16 8.3-23.1 2.7-1.1-.8-2-1.8-2.8-2.9-3-4.1-4.4-9-4.3-14z"/>
                                                    <path className="st3" d="M66 1h328.1c35.9 0 65 29.1 65 65v303c0 35.9-29.1 65-65 65H66c-35.9 0-65-29.1-65-65V66C1 30.1 30.1 1 66 1z"/>
                                                </svg>

                                                <input
                                                    type="tel"
                                                    name="phoneNumber"
                                                    value={formData.phoneNumber || ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                                                    }
                                                    placeholder={t('phonePlaceholder')}
                                                    className="flex-1 p-3 bg-transparent focus:outline-none"
                                                    inputMode="tel"
                                                    pattern="^[0-9+()\\-\\.\\s]{6,}$"
                                                />
                                            </div>
                                        </FormField>

                                    ) : lang === 'zh' ? (
                                        // 🇨🇳 Trung Quốc → WeChat
                                        <FormField label={t('wechat')}>
                                            <div className="flex items-center border border-stone-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 transition bg-white">
                                                {/* WeChat SVG inline */}
                                                <svg
                                                    viewBox="0 0 64 64"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-5 h-5 ml-3 shrink-0"
                                                    aria-hidden="true"
                                                    focusable="false"
                                                >
                                                    <defs>
                                                        <style>{`.cls-1{fill:#00d332}.cls-2{fill:#fff}`}</style>
                                                    </defs>
                                                    <g id="_9-wechat" data-name="9-wechat">
                                                        <rect className="cls-1" width="64" height="64" rx="11.2" ry="11.2"/>
                                                        <path className="cls-2" d="M24.9,11.29c-10.21,0-18.49,6.9-18.49,15.41A14.53,14.53,0,0,0,13,38.49l-.67,4.88a.4.4,0,0,0,.56.42l5.88-2.55a14.46,14.46,0,0,0,6.91.86,12.14,12.14,0,0,1-.54-3.51c0-7.88,7.64-14.29,17-14.29.34,0,.68,0,1,0C41.81,17,34.15,11.29,24.9,11.29Zm-6.57,13a2.4,2.4,0,1,1,2.4-2.4A2.4,2.4,0,0,1,18.33,24.28Zm12.63,0a2.4,2.4,0,1,1,2.4-2.4A2.41,2.41,0,0,1,31,24.28Z"/>
                                                        <path className="cls-2" d="M57.59,38.59c0-7-6.91-12.69-15.43-12.69S26.73,31.58,26.73,38.59s6.91,12.69,15.43,12.69a18.34,18.34,0,0,0,5.56-.87l4.09,2.25a.4.4,0,0,0,.59-.39L52,48.35A11.94,11.94,0,0,0,57.59,38.59ZM37,36.08a1.8,1.8,0,1,1,1.8-1.8A1.8,1.8,0,0,1,37,36.08Zm10.41,0a1.8,1.8,0,1,1,1.8-1.8A1.8,1.8,0,0,1,47.44,36.08Z"/>
                                                    </g>
                                                </svg>

                                                <input
                                                    type="text"
                                                    name="wechatId"
                                                    value={formData.wechatId || ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, wechatId: e.target.value }))
                                                    }
                                                    placeholder={t('wechatPlaceholder')}
                                                    className="flex-1 p-3 bg-transparent focus:outline-none"
                                                />
                                            </div>
                                        </FormField>

                                    ) : (
                                        // 🌍 Khác → Email
                                        <FormField label={t('email')}>
                                            <div className="flex items-center border border-stone-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 transition bg-white">
                                                {/* Gmail SVG inline */}
                                                <svg
                                                    viewBox="0 0 512 512"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-5 h-5 ml-3 shrink-0"
                                                    aria-hidden="true"
                                                    focusable="false"
                                                >
                                                    <g id="_x31_12-gmail_x2C__email_x2C__mail">
                                                        <g>
                                                            <g>
                                                                <g>
                                                                    <rect x="77.045" y="76.565" width="357.904" height="358.87" fill="#F1F5F7"/>
                                                                    <path
                                                                        fill="#DCE6EA"
                                                                        d="M256.002,293.738l178.947,141.697v-279.74L256.002,293.738z"
                                                                    />
                                                                    <path
                                                                        fill="#F84437"
                                                                        d="M449.861,76.565h-14.912L256.002,218.26L77.045,76.565H62.134
                  c-24.693,0-44.737,20.094-44.737,44.858v269.152
                  c0,24.759,20.044,44.859,44.737,44.859h14.911v-279.74l178.957,138.014
                  l178.947-138.047v279.773h14.912
                  c24.699,0,44.742-20.101,44.742-44.859V121.424
                  C494.604,96.66,474.561,76.565,449.861,76.565z"
                                                                    />
                                                                </g>
                                                            </g>
                                                        </g>
                                                    </g>
                                                </svg>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email || ''}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                                                    }
                                                    placeholder={t('emailPlaceholder')}
                                                    className="flex-1 p-3 bg-transparent focus:outline-none"
                                                />
                                            </div>
                                        </FormField>

                                    )}


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
                </>) : (<div className="relative p-8 text-center animate-fade-in rounded-2xl overflow-hidden border border-amber-200 shadow-lg bg-gradient-to-br from-amber-50 via-white to-emerald-50">
                    {/* Hoạ tiết chấm mờ */}
                    <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#fef3c7_2px,transparent_2px)] bg-[length:24px_24px]"></div>

                    {/* Ánh sáng lướt */}
                    <div className="pointer-events-none absolute -inset-1 shimmer-mask"></div>

                    <div className="relative">
                        <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center mb-5 border-4 border-emerald-200 shadow-inner">
                            <i className="fa-solid fa-envelope-circle-check text-4xl text-emerald-600"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-stone-800 drop-shadow-sm">{t('sentSuccessTitle')}</h2>
                        <p className="text-stone-600 mt-3 mb-6 max-w-xs mx-auto">
                            {t('sentSuccessDesc')}
                        </p>
                    </div>
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
        @keyframes shimmerSweep {
          0%   { transform: translateX(-120%); opacity: .0; }
          15%  { opacity: .35; }
          50%  { opacity: .25; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        .shimmer-mask {
          background:
            linear-gradient(115deg, rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%);
          mix-blend-mode: soft-light;
          animation: shimmerSweep 2.8s ease-in-out infinite;
          mask-image: radial-gradient(120% 70% at 10% 50%, black 40%, transparent 60%);
        }
      `}</style>
    </div>);
};


export default App;