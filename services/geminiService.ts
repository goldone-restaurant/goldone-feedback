import { GoogleGenAI, Type } from "@google/genai";
import type { FeedbackData, GeminiAnalysis } from '../types';
import axios from "axios";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper function to convert a File object to a GoogleGenerativeAI.Part object.
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}
const MATTERMOST_WEBHOOK = "https://chat.goldone.vn/hooks/hjakns5xh3d3d8wnuqrgywck4o"; // Hoặc import.meta.env.VITE_MATTERMOST_WEBHOOK

function stars(n?: number) {
    if (!n || n <= 0) return "Không đánh giá";
    const v = Math.max(1, Math.min(5, Math.round(n)));
    return `${v}/5 ⭐`;
}

function buildPayload(form: FeedbackData, analysis: GeminiAnalysis) {
    const emoji =
        analysis?.sentiment === "Tích cực" ? "🟢" :
            analysis?.sentiment === "Tiêu cực" ? "🔴" : "🟡";

    const keywords = Array.isArray(analysis?.keywords) && analysis.keywords.length
        ? analysis.keywords.join(", ")
        : "—";

    return {
        username: "test-automation",
        text: `${emoji} *Feedback mới nhận!* @channel`,
        attachments: [
            {
                color:
                    analysis?.sentiment === "Tích cực" ? "#2ECC71" :
                        analysis?.sentiment === "Tiêu cực" ? "#E74C3C" : "#F1C40F",
                fields: [
                    { title: "Ngày ghé thăm", value: form.visitDate || "—", short: true },
                    { title: "Phòng", value: (form as any).roomNumber || "—", short: true },
                    { title: "SĐT", value: form.phoneNumber || "—", short: true },
                    { title: "Giới thiệu bạn bè", value: form.recommend == null ? "Chưa trả lời" : (form.recommend ? "Có" : "Không"), short: true },

                    { title: "Món ăn", value: stars(form.foodQuality), short: true },
                    { title: "Phục vụ", value: stars(form.service), short: true },
                    { title: "Không gian", value: stars(form.ambiance), short: true },

                    { title: "Cảm xúc AI phân tích", value: analysis?.sentiment ?? "—", short: true },
                    { title: "Từ khóa chính", value: keywords, short: false },
                    { title: "Tóm tắt AI", value: analysis?.summary ?? "—", short: false },
                    { title: "Bình luận", value: (form.comments || "—").trim(), short: false },

                    ...(form.foodComplaint ? [{ title: "Phàn nàn món ăn", value: form.foodComplaint, short: false }] : []),
                    ...(form.serviceComplaint ? [{ title: "Phàn nàn phục vụ", value: form.serviceComplaint, short: false }] : []),
                    ...(form.ambianceComplaint ? [{ title: "Phàn nàn không gian", value: form.ambianceComplaint, short: false }] : []),
                ],
            },
        ],
    };
}

export async function sendToChat(form: FeedbackData, analysis: GeminiAnalysis) {
    if (!MATTERMOST_WEBHOOK) {
        console.error("❌ Thiếu MATTERMOST_WEBHOOK");
        return;
    }

    const payload = buildPayload(form, analysis);

    try {
        await axios.post(MATTERMOST_WEBHOOK, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 8000,
        });
        console.log("✅ Đã gửi feedback lên Mattermost");
    } catch (err: any) {
        console.error("❌ Gửi webhook thất bại:", err?.response?.status, err?.message);
    }
}

export const analyzeFeedback = async (feedback: FeedbackData): Promise<GeminiAnalysis> => {
    
    const formatRating = (rating: number) => rating > 0 ? `${rating}` : 'Không đánh giá';

    let prompt = `
    Phân tích phản hồi sau từ một khách hàng của nhà hàng hải sản.
    - Chất lượng món ăn (1-5 sao): ${formatRating(feedback.foodQuality)}
    - Chất lượng phục vụ (1-5 sao): ${formatRating(feedback.service)}
    - Không gian nhà hàng (1-5 sao): ${formatRating(feedback.ambiance)}
    - Ngày ghé thăm: ${feedback.visitDate}
    - Sẽ giới thiệu cho bạn bè: ${feedback.recommend === null ? 'Chưa trả lời' : feedback.recommend ? 'Có' : 'Không'}
    - Số điện thoại: ${feedback.phoneNumber || 'Không cung cấp.'}`;

    if (feedback.foodComplaint) {
        prompt += `\n- Phàn nàn cụ thể về món ăn: "${feedback.foodComplaint}"`
    }
    if (feedback.serviceComplaint) {
        prompt += `\n- Phàn nàn cụ thể về phục vụ: "${feedback.serviceComplaint}"`
    }
    if (feedback.ambianceComplaint) {
        prompt += `\n- Phàn nàn cụ thể về không gian: "${feedback.ambianceComplaint}"`
    }

    prompt += `\n- Bình luận chung: "${feedback.comments || 'Không có bình luận.'}"`;

    if (feedback.receiptImage) {
        prompt += `\n- Ghi chú: Khách hàng đã đính kèm hình ảnh hóa đơn. Hãy đề cập đến việc này trong bản tóm tắt nếu có liên quan.`;
    }

    prompt += `

    Dựa vào thông tin trên, hãy cung cấp:
    1.  Một bản tóm tắt ngắn gọn (tối đa 30 từ) về trải nghiệm của khách hàng, đặc biệt chú ý đến phàn nàn nếu có.
    2.  Phân loại cảm xúc chung là "Tích cực", "Tiêu cực", hoặc "Trung tính".
    3.  Liệt kê 3-5 từ khóa chính nổi bật nhất từ phản hồi.
    `;
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "Tóm tắt ngắn gọn phản hồi."
        },
        sentiment: {
          type: Type.STRING,
          enum: ["Tích cực", "Tiêu cực", "Trung tính"],
          description: "Cảm xúc chung của phản hồi."
        },
        keywords: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "Các từ khóa chính từ phản hồi."
        }
      },
      required: ["summary", "sentiment", "keywords"]
    };

    try {
        const model = "gemini-2.5-flash";
        const config = {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.2,
        };
        
        let contents;
        if (feedback.receiptImage) {
            const imagePart = await fileToGenerativePart(feedback.receiptImage);
            const textPart = { text: prompt };
            contents = { parts: [textPart, imagePart] };
        } else {
            contents = prompt;
        }

        const response = await ai.models.generateContent({
            model,
            contents,
            config,
        });

        const jsonText = response.text.trim();
        const analysisResult: GeminiAnalysis = JSON.parse(jsonText);
        
        return analysisResult;

    } catch (error) {
        console.error("Error analyzing feedback with Gemini:", error);
        throw new Error("Không thể phân tích phản hồi. Vui lòng thử lại.");
    }
};