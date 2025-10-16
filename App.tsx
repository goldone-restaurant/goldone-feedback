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

const App: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
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
        if (!branchIdStr) {
            // Clear nếu chọn "— Chọn chi nhánh —"
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
            // reset bàn khi đổi chi nhánh
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

        // log cho dev
        console.log(`📍 Chi nhánh ${t.branchId}: ${t.branchName}`);
        console.log(`🏠 Địa chỉ: ${t.branchAddress}`);
        console.log(`🪑 Bàn ${t.tableId}: ${t.tableName} (${t.tableType})`);

        // Điền tự động vào form
        setFormData(prev => ({
            ...prev,
            branchId: t.branchId,
            branchName: t.branchName,
            branchAddress: t.branchAddress,
            tableId: t.tableId,
            tableName: t.tableName,
            tableType: t.tableType,
        }));
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
        <p className="text-center text-sm font-semibold text-orange-700">Bước {currentStep} / 2</p>
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
                                <h2 className="text-3xl font-bold text-white mt-8"
                                    style={{textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>
                                    Gửi Trực Tiếp đến Ban Quản Lý & Chủ Nhà Hàng
                                </h2>
                                <p className="text-stone-300 mt-4 mb-8 max-w-sm">
                                    Chúng tôi cam kết mọi chia sẻ, dù là khen ngợi hay góp ý, đều
                                    được <strong className="font-semibold text-yellow-400">niêm
                                    phong</strong> và đọc kỹ bởi cấp quản lý cao nhất để nâng tầm trải
                                    nghiệm tại Nhà Hàng Goldone.
                                </p>
                            </div>

                            <button onClick={nextStep}
                                    className="w-full bg-yellow-500 text-stone-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-400/50 animate-fade-in animation-delay-700 border-2 border-yellow-600/50">
                                Niêm Phong & Gửi Ý Kiến
                            </button>
                        </div>
                    </div>)}
                    {currentStep > 0 && (<form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <h2 className="text-2xl font-bold text-stone-800 text-center">Chia sẻ trải nghiệm
                            của bạn</h2>
                        <p className="text-center text-stone-500 -mt-4">Phản hồi của bạn giúp chúng tôi phục
                            vụ tốt hơn.</p>

                        {renderStepIndicator()}

                        {currentStep === 1 && (<div className="space-y-6 animate-form-item">
                                {/* Món ăn */}
                                <FormField label="Chất lượng món ăn">
                                    <Rating
                                        rating={formData.foodQuality}
                                        onRatingChange={(value) => handleRatingChange('foodQuality', value)}
                                    />
                                </FormField>

                                {formData.foodQuality > 0 && formData.foodQuality <= 2 && (
                                    <div className="animate-form-item">
                                        <FormField label="Bạn không hài lòng về điều gì ở món ăn?">
          <textarea
              name="foodComplaint"
              rows={3}
              value={formData.foodComplaint}
              onChange={handleInputChange}
              placeholder="Ví dụ: Món ăn bị nguội, quá mặn, không tươi..."
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
          />
                                        </FormField>
                                    </div>)}

                                {formData.foodQuality >= 3 && (<div className="animate-form-item">
                                        <FormField label="Món ăn có điểm gì bạn hài lòng?">
<textarea
    name="foodComplaint"
    rows={3}
    value={formData.foodComplaint}
    onChange={handleInputChange}
    placeholder="💡 Ví dụ: Hải sản tươi, nêm nếm vừa miệng, trình bày đẹp..."
    className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-amber-50/30 placeholder-orange-600 placeholder:font-semibold placeholder:tracking-wide"
/>
                                        </FormField>
                                    </div>)}

                                {/* Phục vụ */}
                                <FormField label="Chất lượng phục vụ">
                                    <Rating
                                        rating={formData.service}
                                        onRatingChange={(value) => handleRatingChange('service', value)}
                                    />
                                </FormField>

                                {formData.service > 0 && formData.service <= 2 && (<div className="animate-form-item">
                                        <FormField label="Bạn không hài lòng về điều gì ở phục vụ?">
          <textarea
              name="serviceComplaint"
              rows={3}
              value={formData.serviceComplaint}
              onChange={handleInputChange}
              placeholder="Ví dụ: Nhân viên không thân thiện, phục vụ chậm..."
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus-border-orange-500 transition"
          />
                                        </FormField>
                                    </div>)}

                                {formData.service >= 3 && (<div className="animate-form-item">
                                        <FormField label="Bạn ấn tượng điều gì về phục vụ?">
<textarea
    name="serviceComplaint"
    rows={3}
    value={formData.serviceComplaint}
    onChange={handleInputChange}
    placeholder="💡 Ví dụ: Nhân viên thân thiện, phục vụ nhanh, quan tâm khách..."
    className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-amber-50/30 placeholder-orange-600 placeholder:font-semibold placeholder:tracking-wide"
/>
                                        </FormField>
                                    </div>)}

                                {/* Không gian */}
                                <FormField label="Không gian nhà hàng">
                                    <Rating
                                        rating={formData.ambiance}
                                        onRatingChange={(value) => handleRatingChange('ambiance', value)}
                                    />
                                </FormField>

                                {formData.ambiance > 0 && formData.ambiance <= 2 && (<div className="animate-form-item">
                                        <FormField label="Bạn không hài lòng về điều gì ở không gian?">
          <textarea
              name="ambianceComplaint"
              rows={3}
              value={formData.ambianceComplaint}
              onChange={handleInputChange}
              placeholder="Ví dụ: Bàn ghế không sạch sẽ, nhạc quá to..."
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
          />
                                        </FormField>
                                    </div>)}

                                {formData.ambiance >= 3 && (<div className="animate-form-item">
                                        <FormField label="Bạn thích điều gì ở không gian?">
   <textarea
       name="ambianceComplaint"
       rows={3}
       value={formData.ambianceComplaint}
       onChange={handleInputChange}
       placeholder="💡 Ví dụ: Không gian sang trọng, sạch sẽ, âm nhạc dễ chịu..."
       className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition bg-amber-50/30 placeholder-orange-600 placeholder:font-semibold placeholder:tracking-wide"
   />
                                        </FormField>
                                    </div>)}
                            </div>)}


                        {currentStep === 2 && (<div className="space-y-6 animate-form-item">
                            <div>
                                <h3 className="text-lg font-semibold text-stone-800 mb-3">Thông tin
                                    chuyến thăm</h3>
                                <FormField label="Ngày bạn ghé thăm *">
                                    <input
                                        type="date"
                                        name="visitDate"
                                        value={formData.visitDate}
                                        onChange={handleInputChange}
                                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                    />
                                </FormField>

                                <div className="mt-2"></div>
                                <FormField label="Chi nhánh">
                                    {/* Input hiển thị (chỉ đọc, người dùng thấy tên CN + địa chỉ) */}
                                    <input
                                        type="text"
                                        name="branchDisplay"
                                        value={
                                            formData.branchName
                                                ? `${formData.branchName} — ${formData.branchAddress}`
                                                : ''
                                        }
                                        readOnly
                                        placeholder="Chi nhánh tự động điền"
                                        className="w-full p-3 border border-stone-300 rounded-lg bg-stone-50 text-stone-700 cursor-not-allowed"
                                    />

                                    {/* Các input ẩn gửi kèm khi submit */}
                                    <input type="hidden" name="branchId" value={formData.branchId ?? ''} />
                                    <input type="hidden" name="branchName" value={formData.branchName ?? ''} />
                                    <input type="hidden" name="branchAddress" value={formData.branchAddress ?? ''} />
                                </FormField>

                                <div className="mt-2"></div>
                                {formData.branchId && (
                                    <FormField label="Bàn/Phòng (Tùy chọn)">
                                        <select
                                            name="tableId"
                                            value={formData.tableId ?? ''}
                                            onChange={handleTableChange}
                                            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition bg-white"
                                        >
                                            <option value="">— Chọn bàn/phòng —</option>
                                            {(TABLES_BY_BRANCH.get(formData.branchId) || []).map(t => (
                                                <option key={t.tableId} value={t.tableId}>
                                                    {t.tableId}. {t.tableName} ({t.tableType})
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                )}
                            </div>

                            <hr className="border-stone-200"/>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-stone-800">Thông tin bổ sung
                                    (Tùy chọn)</h3>
                                <FormField label="Số điện thoại">
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        placeholder="Để chúng tôi có thể liên hệ lại"
                                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                    />
                                </FormField>

                                <FormField label="Đính kèm hóa đơn">
                                    <div className="flex gap-4">
                                        <button type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                                            <i className="fa-solid fa-upload"></i>
                                            <span>Tải ảnh lên</span>
                                        </button>
                                        <button type="button" onClick={() => setShowCamera(true)}
                                                className="flex-1 cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                                            <i className="fa-solid fa-camera"></i>
                                            <span>Chụp ảnh</span>
                                        </button>
                                        <input ref={fileInputRef} id="receipt-upload" type="file"
                                               className="hidden" onChange={handleFileChange}
                                               accept="image/png, image/jpeg"/>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-2 text-center">PNG, JPG (TỐI
                                        ĐA 5MB)</p>

                                    {formData.receiptImage && (
                                        <div className="mt-4 flex items-center justify-between bg-stone-100 p-3 rounded-lg">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {/* Thumbnail */}
                                                <button
                                                    type="button"
                                                    onClick={() => receiptPreview && window.open(receiptPreview, '_blank')}
                                                    className="relative w-16 h-16 rounded-md border border-stone-300 overflow-hidden flex-shrink-0 hover:opacity-90"
                                                    title="Nhấn để xem lớn"
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

                                                {/* Tên + dung lượng */}
                                                <div className="min-w-0">
                                                    <div className="text-sm text-stone-800 font-medium truncate">
                                                        {formData.receiptImage.name}
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        {formatBytes(formData.receiptImage.size)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Xóa */}
                                            <button
                                                type="button"
                                                onClick={() => handleFileSelect(null)}
                                                className="text-red-500 hover:text-red-700 ml-2"
                                                title="Xóa ảnh"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    )}

                                </FormField>
                            </div>
                        </div>)}

                        {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</p>}

                        <div className="pt-4 flex items-center gap-4">
                            {currentStep > 1 && (<button type="button" onClick={prevStep}
                                                         className="w-1/3 bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-lg hover:bg-stone-300 transition duration-300">
                                Quay lại
                            </button>)}
                            {currentStep < 2 && (<button type="button" onClick={nextStep}
                                                         className="flex-1 bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition duration-300">
                                Tiếp tục
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
                    <h2 className="text-2xl font-bold text-stone-800">Đã gửi thành công!</h2>
                    <p className="text-stone-600 mt-3 mb-6 max-w-xs mx-auto">
                        Ban quản lý & chủ nhà hàng đã nhận được ý kiến niêm phong của bạn. Cảm ơn bạn đã giúp
                        Goldone ngày một tốt hơn!
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