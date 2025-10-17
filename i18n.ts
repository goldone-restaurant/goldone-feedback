// i18n.ts
export type Lang = 'vi' | 'en' | 'zh' | 'ja' | 'ko';

type Dict = Record<string, string>;

export const dictionaries: Record<Lang, Dict> = {
    vi: {
        // --- Hero / Intro ---
        heroTitle: "Gửi Trực Tiếp đến Ban Quản Lý & Chủ Nhà Hàng",
        heroDesc: "Chúng tôi cam kết mọi chia sẻ, dù là khen ngợi hay góp ý, đều được niêm phong và đọc kỹ bởi cấp quản lý cao nhất để nâng tầm trải nghiệm tại Nhà Hàng Goldone.",
        ctaSealAndSend: "Niêm Phong & Gửi Ý Kiến",
        stepOf: "Bước {{n}} / 2",

        // --- Form labels ---
        shareYourExp: "Chia sẻ trải nghiệm của bạn",
        helpUsImprove: "Phản hồi của bạn giúp chúng tôi phục vụ tốt hơn.",
        foodQuality: "Chất lượng món ăn",
        foodPositivePrompt: "Món ăn có điểm gì bạn hài lòng?",
        foodNegativePrompt: "Bạn không hài lòng về điều gì ở món ăn?",
        serviceQuality: "Chất lượng phục vụ",
        servicePositivePrompt: "Bạn ấn tượng điều gì về phục vụ?",
        serviceNegativePrompt: "Bạn không hài lòng về điều gì ở phục vụ?",
        ambiance: "Không gian nhà hàng",
        ambiancePositivePrompt: "Bạn thích điều gì ở không gian?",
        ambianceNegativePrompt: "Bạn không hài lòng về điều gì ở không gian?",
        visitInfo: "Thông tin chuyến thăm",
        visitDate: "Ngày bạn ghé thăm",
        phoneNumber: "Số điện thoại",
        attachReceipt: "Đính kèm hóa đơn",
        uploadImage: "Tải ảnh lên",
        takePhoto: "Chụp ảnh",
        maxSize: "PNG, JPG (TỐI ĐA 5MB)",
        back: "Quay lại",
        next: "Tiếp tục",
        sentSuccessTitle: "Đã gửi thành công!",
        sentSuccessDesc: "Ban quản lý & chủ nhà hàng đã nhận được ý kiến niêm phong của bạn. Cảm ơn bạn đã giúp Goldone ngày một tốt hơn!",

        // --- Auto detected labels ---
        currentBranch: "Chi nhánh hiện tại:",
        currentRoom: "Phòng hiện tại:",
        currentVisitDate: "Ngày bạn ghé thăm:",
        unknown: "—",

        // --- Placeholders (positive examples) ---
        phFoodPositive: "💡 Ví dụ: Hải sản tươi, nêm nếm vừa miệng, trình bày đẹp...",
        phServicePositive: "💡 Ví dụ: Nhân viên thân thiện, phục vụ nhanh, quan tâm khách...",
        phAmbiancePositive: "💡 Ví dụ: Không gian sang trọng, sạch sẽ, âm nhạc dễ chịu...",

        // --- Errors ---
        sendError: "Đã xảy ra lỗi khi gửi phản hồi. Vui lòng thử lại.",
    },
    en: {
        heroTitle: "Send Directly to Management & Restaurant Owner",
        heroDesc: "We seal every message—compliment or suggestion—and senior management reads carefully to elevate your Goldone experience.",
        ctaSealAndSend: "Seal & Send Feedback",
        stepOf: "Step {{n}} / 2",

        shareYourExp: "Share your experience",
        helpUsImprove: "Your feedback helps us serve you better.",
        foodQuality: "Food quality",
        foodPositivePrompt: "What did you like about the food?",
        foodNegativePrompt: "What didn’t you like about the food?",
        serviceQuality: "Service quality",
        servicePositivePrompt: "What impressed you about the service?",
        serviceNegativePrompt: "What didn’t you like about the service?",
        ambiance: "Ambience",
        ambiancePositivePrompt: "What did you like about the ambience?",
        ambianceNegativePrompt: "What didn’t you like about the ambience?",
        visitInfo: "Visit information",
        visitDate: "Your visit date",
        phoneNumber: "Phone number",
        attachReceipt: "Attach receipt",
        uploadImage: "Upload image",
        takePhoto: "Take photo",
        maxSize: "PNG, JPG (MAX 5MB)",
        back: "Back",
        next: "Next",
        sentSuccessTitle: "Sent successfully!",
        sentSuccessDesc: "Management & owner have received your sealed feedback. Thank you for helping Goldone improve!",

        currentBranch: "Current branch:",
        currentRoom: "Current room:",
        currentVisitDate: "Visit date:",
        unknown: "—",

        phFoodPositive: "💡 e.g., Fresh seafood, well-seasoned, beautiful plating...",
        phServicePositive: "💡 e.g., Friendly staff, fast service, attentive...",
        phAmbiancePositive: "💡 e.g., Elegant, clean, pleasant music...",

        sendError: "Something went wrong. Please try again.",
    },
    zh: {
        heroTitle: "直接发送至管理层与餐厅老板",
        heroDesc: "我们会密封所有反馈，无论表扬或建议，都会由高层认真阅读以提升您的 Goldone 体验。",
        ctaSealAndSend: "密封并发送反馈",
        stepOf: "第 {{n}} 步 / 共 2 步",

        shareYourExp: "分享您的体验",
        helpUsImprove: "您的反馈将帮助我们提供更好的服务。",
        foodQuality: "菜品质量",
        foodPositivePrompt: "您喜欢菜品的哪些方面？",
        foodNegativePrompt: "您不满意菜品的哪些方面？",
        serviceQuality: "服务质量",
        servicePositivePrompt: "服务有哪些令您印象深刻？",
        serviceNegativePrompt: "您对服务有哪些不满意？",
        ambiance: "用餐环境",
        ambiancePositivePrompt: "您喜欢环境的哪些方面？",
        ambianceNegativePrompt: "您对环境有哪些不满意？",
        visitInfo: "来访信息",
        visitDate: "来访日期",
        phoneNumber: "电话号码",
        attachReceipt: "附件发票",
        uploadImage: "上传图片",
        takePhoto: "拍照",
        maxSize: "PNG, JPG（最大 5MB）",
        back: "返回",
        next: "继续",
        sentSuccessTitle: "发送成功！",
        sentSuccessDesc: "管理层与老板已收到您的密封反馈，感谢您帮助 Goldone 进步！",

        currentBranch: "当前分店：",
        currentRoom: "当前包厢：",
        currentVisitDate: "来访日期：",
        unknown: "—",

        phFoodPositive: "💡 例如：海鲜新鲜、调味适中、摆盘精美…",
        phServicePositive: "💡 例如：员工友好、上菜迅速、细致周到…",
        phAmbiancePositive: "💡 例如：环境雅致、干净整洁、音乐舒适…",

        sendError: "发送失败，请重试。",
    },
    ja: {
        heroTitle: "経営陣・オーナーへ直接届けます",
        heroDesc: "称賛もご意見も封印して、上層部が丁寧に拝読し、Goldoneの体験向上につなげます。",
        ctaSealAndSend: "封印して送信",
        stepOf: "ステップ {{n}} / 2",

        shareYourExp: "体験を共有してください",
        helpUsImprove: "皆さまの声がより良いサービスにつながります。",
        foodQuality: "料理の品質",
        foodPositivePrompt: "料理のどこが良かったですか？",
        foodNegativePrompt: "料理のどこが不満でしたか？",
        serviceQuality: "サービスの品質",
        servicePositivePrompt: "サービスのどこが印象的でしたか？",
        serviceNegativePrompt: "サービスのどこが不満でしたか？",
        ambiance: "雰囲気",
        ambiancePositivePrompt: "雰囲気のどこが良かったですか？",
        ambianceNegativePrompt: "雰囲気のどこが不満でしたか？",
        visitInfo: "来店情報",
        visitDate: "来店日",
        phoneNumber: "電話番号",
        attachReceipt: "レシート添付",
        uploadImage: "画像をアップロード",
        takePhoto: "写真を撮る",
        maxSize: "PNG, JPG（最大 5MB）",
        back: "戻る",
        next: "次へ",
        sentSuccessTitle: "送信しました！",
        sentSuccessDesc: "封印済みのご意見を受領しました。ご協力に感謝します！",

        currentBranch: "現在の支店：",
        currentRoom: "現在の部屋：",
        currentVisitDate: "来店日：",
        unknown: "—",

        phFoodPositive: "💡 例：海鮮が新鮮、味付けが良い、盛り付けが綺麗…",
        phServicePositive: "💡 例：スタッフが親切、提供が早い、気配りが良い…",
        phAmbiancePositive: "💡 例：高級感、清潔、心地よい音楽…",

        sendError: "送信に失敗しました。再試行してください。",
    },
    ko: {
        heroTitle: "경영진 및 오너에게 직접 전달",
        heroDesc: "칭찬과 제안 모두를 봉인하여 경영진이 꼼꼼히 확인하고 Goldone 경험을 개선합니다.",
        ctaSealAndSend: "봉인하고 전송",
        stepOf: "단계 {{n}} / 2",

        shareYourExp: "경험을 공유해주세요",
        helpUsImprove: "소중한 의견은 더 나은 서비스로 이어집니다.",
        foodQuality: "음식 품질",
        foodPositivePrompt: "음식의 어떤 점이 좋았나요?",
        foodNegativePrompt: "음식의 어떤 점이 아쉬웠나요?",
        serviceQuality: "서비스 품질",
        servicePositivePrompt: "서비스의 어떤 점이 인상적이었나요?",
        serviceNegativePrompt: "서비스의 어떤 점이 아쉬웠나요?",
        ambiance: "매장 분위기",
        ambiancePositivePrompt: "분위기의 어떤 점이 좋았나요?",
        ambianceNegativePrompt: "분위기의 어떤 점이 아쉬웠나요?",
        visitInfo: "방문 정보",
        visitDate: "방문 날짜",
        phoneNumber: "전화번호",
        attachReceipt: "영수증 첨부",
        uploadImage: "이미지 업로드",
        takePhoto: "사진 촬영",
        maxSize: "PNG, JPG (최대 5MB)",
        back: "뒤로",
        next: "계속",
        sentSuccessTitle: "전송 완료!",
        sentSuccessDesc: "봉인된 의견을 접수했습니다. 감사합니다!",

        currentBranch: "현재 지점:",
        currentRoom: "현재 룸:",
        currentVisitDate: "방문 날짜:",
        unknown: "—",

        phFoodPositive: "💡 예: 신선한 해산물, 적절한 간, 보기 좋은 플레이팅…",
        phServicePositive: "💡 예: 친절한 직원, 빠른 응대, 세심한 배려…",
        phAmbiancePositive: "💡 예: 고급스러운 분위기, 청결함, 편안한 음악…",

        sendError: "전송 오류가 발생했습니다. 다시 시도해주세요.",
    },
};

export function interpolate(str: string, params?: Record<string, any>) {
    if (!params) return str;
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (params[k] ?? ''));
}

export function createI18n(initial: Lang = 'vi') {
    let lang: Lang = initial;
    return {
        get lang() { return lang; },
        setLang(next: Lang) { lang = next; },
        t(key: string, params?: Record<string, any>) {
            const dict = dictionaries[lang] || dictionaries.vi;
            const raw = dict[key] || dictionaries.vi[key] || key;
            return interpolate(raw, params);
        },
    };
}
