import axios from "axios";
import { FeedbackData, GeminiAnalysis } from "@/types.ts";

type MMFileUploadResp = { file_infos: Array<{ id: string }> };

// ✅ Ưu tiên ENV, fallback để dev local dễ chạy
const MM_URL = import.meta.env.VITE_MM_URL || "https://chat.goldone.vn";
const MM_CHANNEL_ID =
    import.meta.env.VITE_MM_CHANNEL_ID || "hj8rn3iai7ydjpof3shddymrke";
const MM_BOT_TOKEN =
    import.meta.env.VITE_MM_BOT_TOKEN || "11k6e8mfdi8xpy8rhus341hbua";

/** Sao chép cách hiển thị rating gọn gàng */
function stars(n?: number) {
    if (!n || n <= 0) return "—";
    const v = Math.max(1, Math.min(5, Math.round(n)));
    return `${v}/5 ⭐`;
}

/** Xác định hiển thị Ngôn ngữ */
const LANG_DISPLAY: Record<string, string> = {
    vi: "🇻🇳 Tiếng Việt",
    en: "🇺🇸 English",
    zh: "🇨🇳 中文",
    ja: "🇯🇵 日本語",
    ko: "🇰🇷 한국어",
};

/** Lấy liên hệ tuỳ ngôn ngữ */
function resolveContact(form: FeedbackData): {
    label: string; // tiêu đề field
    value: string; // giá trị hiển thị
} {
    const lang = (form.userLanguage || "vi").trim().toLowerCase();

    if (lang === "vi") {
        return { label: "SĐT", value: form.phoneNumber?.trim() || "—" };
    }
    if (lang === "zh") {
        return { label: "WeChat", value: form.wechatId?.trim() || "—" };
    }
    return { label: "Email", value: form.email?.trim() || "—" };
}

/** Build attachment cho Mattermost */
function buildPayload(form: FeedbackData, analysis: GeminiAnalysis) {
    // Map sentiment (nếu service trả tiếng Việt). Bạn có thể mở rộng đa ngôn ngữ nếu cần.
    const sentiment = analysis?.sentiment ?? "—";
    const emoji =
        sentiment === "Tích cực" ? "🟢" : sentiment === "Tiêu cực" ? "🔴" : "🟡";

    const keywords =
        Array.isArray(analysis?.keywords) && analysis.keywords.length
            ? analysis.keywords.join(", ")
            : "—";

    const complaints: Array<{ label: string; text: string }> = [];
    if (form.foodComplaint?.trim())
        complaints.push({ label: "Món ăn", text: form.foodComplaint.trim() });
    if (form.serviceComplaint?.trim())
        complaints.push({ label: "Phục vụ", text: form.serviceComplaint.trim() });
    if (form.ambianceComplaint?.trim())
        complaints.push({ label: "Không gian", text: form.ambianceComplaint.trim() });

    const complaintsDiff = complaints.length
        ? ["```diff", ...complaints.map((c) => `- ${c.label}: ${c.text}`), "```"].join("\n")
        : "";

    const branchDisplay = form.branchName
        ? `CN ${form.branchId} – ${form.branchName}\n${form.branchAddress}`
        : "—";

    const tableDisplay = form.tableName ? `${form.tableName}` : "—";

    const languageDisplay =
        LANG_DISPLAY[form.userLanguage || "vi"] || form.userLanguage || "—";

    const contact = resolveContact(form); // 👈 Lấy trường liên hệ theo ngôn ngữ

    const mainAttachment: any = {
        color: "#2ECC71",
        fields: [
            { title: "Chi nhánh", value: branchDisplay, short: false },
            { title: "Bàn/Phòng", value: tableDisplay, short: true },
            { title: "Ngày ghé thăm", value: form.visitDate || "—", short: true },
            { title: contact.label, value: contact.value, short: true }, // 👈 Liên hệ động
            { title: "Ngôn ngữ", value: languageDisplay, short: true },
            { title: "Món ăn", value: stars(form.foodQuality), short: true },
            { title: "Phục vụ", value: stars(form.service), short: true },
            { title: "Không gian", value: stars(form.ambiance), short: true },
            { title: "Cảm xúc AI phân tích", value: sentiment, short: true },
            { title: "Từ khóa chính", value: keywords, short: false },
            { title: "Tóm tắt AI", value: analysis?.summary ?? "—", short: false },
        ],
        ...(complaintsDiff ? { text: ["### Ý kiến cụ thể", complaintsDiff].join("\n") } : {}),
    };

    return {
        username: "test-automation",
        text: `${emoji} *Feedback mới nhận từ khách hàng!*`,
        attachments: [mainAttachment],
    };
}

/** Gửi vào Mattermost */
export async function sendToChat(form: FeedbackData, analysis: GeminiAnalysis) {
    const built = buildPayload(form, analysis); // { text, attachments }
    let fileIds: string[] = [];

    try {
        // 1) Upload file nếu có
        if (form.receiptImage) {
            const fd = new FormData();
            fd.append("channel_id", MM_CHANNEL_ID);
            fd.append("files", form.receiptImage, form.receiptImage.name);

            const uploadRes = await axios.post<MMFileUploadResp>(
                `${MM_URL}/api/v4/files`,
                fd,
                {
                    headers: {
                        Authorization: `Bearer ${MM_BOT_TOKEN}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            fileIds = (uploadRes.data.file_infos || []).map((f: any) => f.id);
            console.log("✅ Uploaded file:", fileIds);
        }

        // 2) Tạo post gửi message + file_ids + attachments
        const postBody = {
            channel_id: MM_CHANNEL_ID,
            message: built.text,
            file_ids: fileIds,
            props: { attachments: built.attachments },
        };

        const postRes = await axios.post(`${MM_URL}/api/v4/posts`, postBody, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${MM_BOT_TOKEN}`,
            },
        });

        console.log("✅ Sent post:", postRes.data);
        return postRes.data;
    } catch (err: any) {
        console.error(
            "❌ Mattermost send error:",
            err.response?.status,
            err.message
        );
        if (err.response?.data) console.error(err.response.data);
    }
}
