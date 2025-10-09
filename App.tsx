import React, { useState, useCallback, useRef } from 'react';
import { FeedbackData, GeminiAnalysis } from './types';
import { analyzeFeedback } from './services/geminiService';
import Header from './components/Header';
import Rating from './components/Rating';
import FormField from './components/FormField';
import SubmitButton from './components/SubmitButton';
import CameraCapture from './components/CameraCapture';
import GoldOneLogo from './components/icons/GoldOneLogo';

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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRatingChange = (category: keyof FeedbackData, value: number) => {
    setFormData((prev) => ({ ...prev, [category]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setFormData(prev => ({ ...prev, receiptImage: null }));
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
      comments: '',
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
  
  const renderStepIndicator = () => (
    <div className="mb-6">
        <p className="text-center text-sm font-semibold text-orange-700">Bước {currentStep} / 2</p>
        <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1">
            <div className="bg-orange-600 h-1.5 rounded-full" style={{ width: `${(currentStep / 2) * 100}%` }}></div>
        </div>
    </div>
  );

  const Fish = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg viewBox="0 0 120 60" className={`absolute ${className}`} style={style} fill="currentColor">
      <path d="M118.3,29.3c0,0-12.3-3.8-21.2-3.8c-10.3,0-20.9,4.9-20.9,4.9s-9.3-5.2-20.9-4.9c-8.9,0-21.2,3.8-21.2,3.8c-1.9,0-1.9,3,0,3c0,0,12.3,3.8,21.2,3.8c10.3,0,20.9-4.9,20.9-4.9s9.3,5.2,20.9,4.9c8.9,0,21.2-3.8,21.2-3.8C120.2,32.3,120.2,29.3,118.3,29.3z"/>
      <path d="M118.3,29.3c-2.4,0-4.8,0.2-7,0.5c-1.3-3-3.4-5.5-5.9-7.3c-5-3.6-11.7-5.5-19.1-5.5c-10.3,0-19,3.2-19,3.2s-8.6-3.2-19-3.2c-7.3,0-14.1,1.9-19.1,5.5c-2.5,1.8-4.6,4.3-5.9,7.3c-2.2-0.3-4.6-0.5-7-0.5c-1.9,0-1.9,3,0,3c2.4,0,4.8,0.2,7,0.5c1.3,3,3.4,5.5,5.9,7.3c5,3.6,11.7,5.5,19.1,5.5c10.3,0,19-3.2,19-3.2s8.6,3.2,19,3.2c7.3,0,14.1,1.9,19.1-5.5c2.5-1.8,4.6-4.3,5.9-7.3c2.2,0.3,4.6,0.5,7,0.5C120.2,32.3,120.2,29.3,118.3,29.3z M60,42.7c-12.1,0-22.3-4-22.3-4s-3.3,4-12.7,4c-9,0-16.3-4.4-16.3-4.4S4.9,39.3,4.9,32c0-2.5,0.4-5,1-7.3c0,0,7.8,4.4,18.7,4.4c9.4,0,12.7-4,12.7-4s10.1,4,22.7,4c12.1,0,22.3-4,22.3-4s3.3,4,12.7,4c9,0,16.3-4.4,16.3-4.4c3.8,1,3.8,7.9,3.8,7.9C114.9,39.3,114.9,42.7,60,42.7z"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-stone-100 font-sans">
      <Header />
       {showCamera && (
          <CameraCapture
              onCapture={handlePhotoTaken}
              onClose={() => setShowCamera(false)}
          />
        )}
      <main className="p-4 max-w-md mx-auto -mt-20">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border-4 border-white">
          {!isSubmitted ? (
            <>
              {currentStep === 0 && (
                 <div className="relative text-center flex flex-col items-center justify-center min-h-[550px] overflow-hidden p-8 bg-slate-900">
                    <div className="absolute inset-0 z-0 opacity-70">
                      {/* Fish swimming in the background */}
                      <Fish className="w-24 h-24 text-yellow-500/20" style={{ top: '20%', animation: 'swim 25s linear infinite' }} />
                      <Fish className="w-32 h-32 text-yellow-500/30" style={{ top: '40%', animation: 'swim-reverse 30s linear infinite 5s' }} />
                      <Fish className="w-20 h-20 text-yellow-500/20" style={{ top: '70%', animation: 'swim 20s linear infinite 8s' }} />
                    </div>
                    {/* Bubbles rising in the foreground */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {[...Array(15)].map((_, i) => (
                           <div key={i} className="absolute bottom-0 rounded-full bg-yellow-400/20" style={{
                              left: `${Math.random() * 100}%`,
                              width: `${2 + Math.random() * 4}px`,
                              height: `${2 + Math.random() * 4}px`,
                              animation: `bubble ${5 + Math.random() * 8}s linear infinite`,
                              animationDelay: `${Math.random() * 10}s`
                           }}></div>
                        ))}
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-full">
                       <div className="w-40 h-40 rounded-full bg-yellow-500 flex items-center justify-center animate-stamp-in shadow-2xl" style={{ boxShadow: '0 0 25px rgba(250, 204, 21, 0.4), 0 0 10px rgba(0,0,0,0.5) inset' }}>
                          <GoldOneLogo className="w-20 h-20 text-yellow-800" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }} />
                       </div>
                       
                       <div className="animate-fade-in animation-delay-500">
                         <h2 className="text-3xl font-bold text-white mt-8" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>
                            Gửi Trực Tiếp Đến Ban Quản Lý & Chủ Nhà Hàng
                         </h2>
                         <p className="text-stone-300 mt-4 mb-8 max-w-sm">
                            Chúng tôi cam kết mọi chia sẻ, dù là khen ngợi hay góp ý, đều được <strong className="font-semibold text-yellow-400">niêm phong</strong> và đọc kỹ bởi cấp quản lý cao nhất để nâng tầm trải nghiệm tại Gold One.
                         </p>
                       </div>
 
                       <button onClick={nextStep} className="w-full bg-yellow-500 text-stone-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-400/50 animate-fade-in animation-delay-700 border-2 border-yellow-600/50">
                           Niêm Phong & Gửi Ý Kiến
                       </button>
                    </div>
                </div>
              )}
              {currentStep > 0 && (
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <h2 className="text-2xl font-bold text-stone-800 text-center">Chia sẻ trải nghiệm của bạn</h2>
                  <p className="text-center text-stone-500 -mt-4">Phản hồi của bạn giúp chúng tôi phục vụ tốt hơn.</p>
                  
                  {renderStepIndicator()}
                  
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-form-item">
                      <FormField label="Chất lượng món ăn">
                        <Rating rating={formData.foodQuality} onRatingChange={(value) => handleRatingChange('foodQuality', value)} />
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
                        </div>
                      )}
                      
                      <FormField label="Chất lượng phục vụ">
                        <Rating rating={formData.service} onRatingChange={(value) => handleRatingChange('service', value)} />
                      </FormField>
                      
                      {formData.service > 0 && formData.service <= 2 && (
                        <div className="animate-form-item">
                            <FormField label="Bạn không hài lòng về điều gì ở phục vụ?">
                                <textarea
                                name="serviceComplaint"
                                rows={3}
                                value={formData.serviceComplaint}
                                onChange={handleInputChange}
                                placeholder="Ví dụ: Nhân viên không thân thiện, phục vụ chậm..."
                                className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                />
                            </FormField>
                        </div>
                      )}

                      <FormField label="Không gian nhà hàng">
                        <Rating rating={formData.ambiance} onRatingChange={(value) => handleRatingChange('ambiance', value)} />
                      </FormField>

                      {formData.ambiance > 0 && formData.ambiance <= 2 && (
                        <div className="animate-form-item">
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
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 2 && (
                     <div className="space-y-6 animate-form-item">
                        <div>
                            <h3 className="text-lg font-semibold text-stone-800 mb-3">Thông tin chuyến thăm</h3>
                            <FormField label="Ngày bạn ghé thăm *">
                                <input
                                type="date"
                                name="visitDate"
                                value={formData.visitDate}
                                onChange={handleInputChange}
                                className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                />
                            </FormField>
                        </div>
                        
                        <hr className="border-stone-200" />

                        <div>
                            <h3 className="text-lg font-semibold text-stone-800 mb-3">Mức độ hài lòng</h3>
                             <FormField label="Bạn có giới thiệu nhà hàng cho bạn bè không?">
                                <div className="flex gap-4">
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, recommend: true }))} className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition ${formData.recommend === true ? 'bg-orange-600 text-white shadow-md' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                                    <i className="fa-solid fa-thumbs-up mr-2"></i> Có
                                </button>
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, recommend: false }))} className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition ${formData.recommend === false ? 'bg-rose-600 text-white shadow-md' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                                    <i className="fa-solid fa-thumbs-down mr-2"></i> Không
                                </button>
                                </div>
                            </FormField>
                        </div>

                        <hr className="border-stone-200" />
                        
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-stone-800">Thông tin bổ sung (Tùy chọn)</h3>
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
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                                         <i className="fa-solid fa-upload"></i>
                                        <span>Tải ảnh lên</span>
                                    </button>
                                     <button type="button" onClick={() => setShowCamera(true)} className="flex-1 cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                                         <i className="fa-solid fa-camera"></i>
                                        <span>Chụp ảnh</span>
                                    </button>
                                    <input ref={fileInputRef} id="receipt-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg" />
                                </div>
                                 <p className="text-xs text-stone-500 mt-2 text-center">PNG, JPG (TỐI ĐA 5MB)</p>

                                {formData.receiptImage && (
                                    <div className="mt-4 flex items-center justify-between bg-stone-100 p-3 rounded-lg">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <i className="fa-solid fa-image text-stone-500 flex-shrink-0"></i>
                                            <span className="text-sm text-stone-700 font-medium truncate">{formData.receiptImage.name}</span>
                                        </div>
                                        <button type="button" onClick={() => handleFileSelect(null)} className="text-red-500 hover:text-red-700 ml-2">
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
                    {currentStep > 1 && (
                      <button type="button" onClick={prevStep} className="w-1/3 bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-lg hover:bg-stone-300 transition duration-300">
                        Quay lại
                      </button>
                    )}
                    {currentStep < 2 && (
                      <button type="button" onClick={nextStep} className="flex-1 bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition duration-300">
                        Tiếp tục
                      </button>
                    )}
                    {currentStep === 2 && (
                      <div className="flex-1">
                        <SubmitButton isLoading={isLoading} disabled={isLoading} />
                      </div>
                    )}
                  </div>

                </form>
              )}
            </>
          ) : (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <i className="fa-solid fa-check text-3xl text-emerald-600"></i>
              </div>
              <h2 className="text-2xl font-bold text-stone-800">Cảm ơn bạn đã phản hồi!</h2>
              <p className="text-stone-600 mt-2">Chúng tôi rất trân trọng ý kiến của bạn.</p>

              {analysis && (
                <div className="text-left bg-stone-50 rounded-lg p-4 mt-8 border border-stone-200">
                    <h3 className="font-bold text-stone-700 mb-3 text-lg">Phân tích phản hồi của bạn</h3>
                    <div className="space-y-3 text-sm">
                        <p><strong className="font-semibold text-stone-600">Tóm tắt:</strong> <span className="text-stone-800">{analysis.summary}</span></p>
                        <p><strong className="font-semibold text-stone-600">Cảm xúc:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${analysis.sentiment === 'Tích cực' ? 'bg-emerald-100 text-emerald-800' : analysis.sentiment === 'Tiêu cực' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{analysis.sentiment}</span></p>
                        <div>
                            <strong className="font-semibold text-stone-600">Từ khóa chính:</strong>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {analysis.keywords.map(kw => <span key={kw} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">{kw}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
              )}

              <button onClick={resetForm} className="mt-8 w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                Gửi phản hồi khác
              </button>
            </div>
          )}
        </div>
        <footer className="text-center py-6 text-stone-500 text-xs">
          <p>&copy; {new Date().getFullYear()} Gold One. All Rights Reserved.</p>
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
            0% { transform: translateX(-100%) translateY(20px) rotate(-5deg); }
            50% { transform: translateX(50vw) translateY(-20px) rotate(5deg); }
            100% { transform: translateX(110vw) translateY(20px) rotate(-5deg); }
        }
        @keyframes swim-reverse {
            0% { transform: translateX(110vw) translateY(-20px) rotate(5deg) scaleX(-1); }
            50% { transform: translateX(50vw) translateY(20px) rotate(-5deg) scaleX(-1); }
            100% { transform: translateX(-100%) translateY(-20px) rotate(5deg) scaleX(-1); }
        }
        @keyframes bubble {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-150px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;