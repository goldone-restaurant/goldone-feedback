// sendToChatBrowser.ts
// ⚠️ Demo ONLY – token nằm trên client, không an toàn cho production

import {FeedbackData, GeminiAnalysis} from "@/types.ts";
const MM_URL="https://chat.goldone.vn"
const MM_BOT_TOKEN="538a85qojjfi7xr8t6coqtp6or"
const MM_CHANNEL_ID="goldone-feedback-khach-hang"


type MMFileUploadResp = {
    file_infos: Array<{ id: string }>;
};

export async function sendToChat(form: FeedbackData, analysis: GeminiAnalysis) {
    const built = buildPayload(form, analysis); // dùng đúng hàm của bạn, trả { text, attachments }

    // 1) (tuỳ) Upload ảnh để lấy file_ids
    let fileIds: string[] = [];
    if (form.receiptImage) {
        const fd = new FormData();
        fd.append('channel_id', MM_CHANNEL_ID);
        fd.append('files', form.receiptImage, form.receiptImage.name);

        const upRes = await fetch(`${MM_URL}/api/v4/files`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${MM_BOT_TOKEN}` },
            body: fd,
        });

        if (!upRes.ok) {
            const t = await upRes.text();
            console.error('Upload file failed:', upRes.status, t);
            // vẫn tiếp tục post text nếu muốn
        } else {
            const upJson = (await upRes.json()) as MMFileUploadResp;
            fileIds = (upJson.file_infos || []).map((fi) => fi.id);
        }
    }

    // 2) Tạo post kèm file_ids + attachments (Slack-style)
    const postBody = {
        channel_id: MM_CHANNEL_ID,
        message: built.text,
        file_ids: fileIds, // rỗng nếu không có ảnh
        props: { attachments: built.attachments },
    };

    const postRes = await fetch(`${MM_URL}/api/v4/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MM_BOT_TOKEN}`,
        },
        body: JSON.stringify(postBody),
    });

    if (!postRes.ok) {
        const t = await postRes.text();
        throw new Error(`Create post failed: ${postRes.status} ${t}`);
    }

    // ok
    return await postRes.json();
}

function stars(n?: number) {
    if (!n || n <= 0) return "Không đánh giá";
    const v = Math.max(1, Math.min(5, Math.round(n)));
    return `${v}/5 ⭐`;
}

function buildPayload(form: FeedbackData, analysis: GeminiAnalysis) {
    const emoji =
        analysis?.sentiment === "Tích cực" ? "🟢" :
            analysis?.sentiment === "Tiêu cực" ? "🔴" : "🟡";

    const keywords =
        Array.isArray(analysis?.keywords) && analysis.keywords.length
            ? analysis.keywords.join(", ")
            : "—";

    // 1) Gom các mục có comment
    const complaints: Array<{ label: string; text: string }> = [];
    if (form.foodComplaint?.trim())
        complaints.push({ label: "Món ăn", text: form.foodComplaint.trim() });
    if (form.serviceComplaint?.trim())
        complaints.push({ label: "Phục vụ", text: form.serviceComplaint.trim() });
    if (form.ambianceComplaint?.trim())
        complaints.push({ label: "Không gian", text: form.ambianceComplaint.trim() });

    // 2) Tô đỏ các comment bằng khối diff
    const complaintsDiff = complaints.length
        ? ["```diff", ...complaints.map(c => `- ${c.label}: ${c.text}`), "```"].join("\n")
        : "";

    // 3) Attachment chính — luôn màu xanh, hiển thị y hệt đánh giá tích cực
    const mainAttachment: any = {
        color: "#2ECC71",
        fields: [
            { title: "Ngày ghé thăm", value: form.visitDate || "—", short: true },
            { title: "Phòng", value: (form as any).roomNumber || "—", short: true },
            { title: "SĐT", value: form.phoneNumber || "—", short: true },
            { title: "Món ăn", value: stars(form.foodQuality), short: true },
            { title: "Phục vụ", value: stars(form.service), short: true },
            { title: "Không gian", value: stars(form.ambiance), short: true },
            { title: "Cảm xúc AI phân tích", value: analysis?.sentiment ?? "—", short: true },
            { title: "Từ khóa chính", value: keywords, short: false },
            { title: "Tóm tắt AI", value: analysis?.summary ?? "—", short: false },
        ],
        ...(complaintsDiff
            ? {
                text: [
                    "### Ý kiến cụ thể",
                    complaintsDiff
                ].join("\n")
            }
            : {})
    };

    // 4) Payload cuối
    return {
        username: "test-automation",
        text: `${emoji} *Feedback mới nhận!* @channel`,
        attachments: [mainAttachment],
    };
}