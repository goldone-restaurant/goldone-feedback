/**
 * Cloudflare Worker: Cooldown 30 phút cho khảo sát
 *
 * Cần cấu hình:
 *  - KV binding: FEEDBACK_KV
 *  - (Tuỳ chọn) ORIGIN = upstream thật (KHÔNG phải chính domain đang gắn route)
 */

export interface Env {
	FEEDBACK_KV: KVNamespace;
	ORIGIN?: string; // ví dụ: https://your-app.pages.dev (KHÔNG dùng https://phanhoidichvu.goldone.vn)
}

const COOLDOWN_MS = 30 * 60 * 1000;        // 30 phút
const SURVEY_PATHS = ["/", "/index.html"]; // các URL là "trang khảo sát"
const SUBMIT_API_PATH = "/api/submit";     // endpoint submit để đóng dấu thời gian

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			return await handle(request, env);
		} catch (e: any) {
			// Bắt mọi lỗi để tránh Error 1101 và xem log qua `wrangler tail`
			console.error("UNCAUGHT", e);
			return new Response(
				JSON.stringify({ error: "Worker crashed", message: String(e) }),
				{ status: 500, headers: { "content-type": "application/json" } }
			);
		}
	},
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);

	// Lấy hoặc cấp cookie 'sid'
	let sid = safeGetCookie(request.headers.get("Cookie"), "sid");
	if (!sid) sid = crypto.randomUUID();

	// 1) GET trang khảo sát -> kiểm cooldown
	// 1) GET trang khảo sát -> kiểm cooldown
	if (request.method === "GET" && isSurveyPage(url.pathname)) {
		// ✅ NEW: nếu đã vào URL cảm ơn rồi thì bỏ qua redirect để tránh loop
		if (url.searchParams.get("thanks") === "1") {
			const retry = url.searchParams.get("retry_after") || "";
			const loc = new URL(url.origin);
			loc.pathname = "/goldone-feedback/thankyou.html";
			if (retry) loc.searchParams.set("retry_after", retry);

			return new Response(null, {
				status: 302,
				headers: setSidCookie(sid, {
					"Location": loc.toString(),
					"Cache-Control": "no-store",
				}),
			});
		}

		try {
			const now = Date.now();
			const lastStr = await env.FEEDBACK_KV.get(kCooldown(sid), "text");
			if (lastStr) {
				const last = Number(lastStr);
				const diff = now - last;
				if (!Number.isNaN(last) && diff < COOLDOWN_MS) {
					const minsLeft = Math.ceil((COOLDOWN_MS - diff) / 60000);
					const thanksUrl = new URL(url.origin);
					thanksUrl.pathname = "/";
					thanksUrl.searchParams.set("thanks", "1");
					thanksUrl.searchParams.set("retry_after", String(minsLeft));

					return new Response(null, {
						status: 302,
						headers: setSidCookie(sid, {
							"Location": thanksUrl.toString(),
							"Cache-Control": "no-store",
						}),
					});
				}
			}
		} catch (e) {
			console.error("KV check error:", e);
			// Cho qua để không vỡ trải nghiệm nếu KV lỗi
		}

		// Không cooldown -> proxy trang form
		return proxyToOriginOrHello(request, env, sid);
	}


	// NEW: GET /api/cooldown -> trả trạng thái còn bao lâu (phút)
	if (request.method === "GET" && url.pathname === "/api/cooldown") {
		const now = Date.now();
		const lastStr = await env.FEEDBACK_KV.get(kCooldown(sid), "text");
		if (!lastStr) {
			return new Response(JSON.stringify({ active: false, retry_after: 0 }), {
				status: 200,
				headers: { "Content-Type": "application/json; charset=utf-8" },
			});
		}
		const last = Number(lastStr);
		const diff = now - last;
		if (Number.isNaN(last) || diff >= COOLDOWN_MS) {
			return new Response(JSON.stringify({ active: false, retry_after: 0 }), {
				status: 200,
				headers: { "Content-Type": "application/json; charset=utf-8" },
			});
		}
		const minsLeft = Math.ceil((COOLDOWN_MS - diff) / 60000);
		return new Response(JSON.stringify({ active: true, retry_after: minsLeft }), {
			status: 200,
			headers: { "Content-Type": "application/json; charset=utf-8" },
		});
	}

	// 2) POST submit -> ghi thời điểm vào KV
	if (request.method === "POST" && url.pathname === SUBMIT_API_PATH) {
		try {
			const now = Date.now();
			await env.FEEDBACK_KV.put(kCooldown(sid), String(now), {
				expirationTtl: 60 * 60 * 24 * 14, // 14 ngày
			});
			return new Response(JSON.stringify({ ok: true, ts: now }), {
				status: 200,
				headers: setSidCookie(sid, {
					"Content-Type": "application/json; charset=utf-8",
					"Cache-Control": "no-store",
				}),
			});
		} catch (e) {
			console.error("KV put error:", e);
			return new Response(JSON.stringify({ ok: false, error: "kv_put_failed" }), {
				status: 500,
				headers: { "content-type": "application/json" },
			});
		}
	}

	// 3) Các route khác -> proxy/pass qua ORIGIN (nếu có) hoặc trả Hello
	return proxyToOriginOrHello(request, env, sid);
}

// ===== Helpers =====
function kCooldown(sid: string) {
	return `cooldown:${sid}`;
}
function isSurveyPage(pathname: string) {
	return SURVEY_PATHS.includes(pathname);
}
function safeGetCookie(cookieHeader: string | null, name: string) {
	if (!cookieHeader) return "";
	try {
		const m = cookieHeader.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
		return m ? decodeURIComponent(m[1]) : "";
	} catch {
		return "";
	}
}
function setSidCookie(sid: string, extra: Record<string, string> = {}) {
	return {
		"Set-Cookie": `sid=${encodeURIComponent(sid)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
		...extra,
	};
}

async function proxyToOriginOrHello(request: Request, env: Env, sid: string) {
	const reqUrl = new URL(request.url);

	if (!env.ORIGIN) {
		return new Response("Hello from Worker (no ORIGIN set).", {
			headers: setSidCookie(sid, { "Content-Type": "text/plain; charset=utf-8" }),
		});
	}

	const originUrl = new URL(env.ORIGIN); // ⚠️ phải có "/" cuối
	if (originUrl.host === reqUrl.host) {
		console.error("ORIGIN misconfigured: points to same host -> loop");
		return new Response(
			"Misconfigured ORIGIN (loop). Set ORIGIN to your upstream (e.g., https://goldone-restaurant.github.io/goldone-feedback/).",
			{ status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
		);
	}

	// ✅ Join path: nếu path đã bắt đầu bằng basePrefix thì giữ nguyên,
	// ngược lại thì ghép vào sau basePrefix.
	function joinOriginPath(origin: URL, path: string, search: string) {
		const o = new URL(origin.toString());
		// basePrefix = "/goldone-feedback/"
		const basePrefix = origin.pathname.endsWith("/")
			? origin.pathname
			: origin.pathname + "/";

		if (path === "/" || path === "") {
			o.pathname = basePrefix;        // root -> đúng base của ORIGIN
		} else if (path.startsWith(basePrefix)) {
			o.pathname = path;              // đã có prefix -> dùng nguyên đường dẫn
		} else {
			const trimmed = path.startsWith("/") ? path.slice(1) : path;
			o.pathname = basePrefix + trimmed; // thêm vào sau prefix
		}
		o.search = search;
		return o.toString();
	}

	const targetUrl = joinOriginPath(originUrl, reqUrl.pathname, reqUrl.search);

	try {
		const resp = await fetch(targetUrl, new Request(request));
		const headers = new Headers(resp.headers);
		headers.set(
			"Set-Cookie",
			`sid=${encodeURIComponent(sid)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
		);
		return new Response(resp.body, { status: resp.status, headers });
	} catch (e) {
		console.error("Proxy error:", e);
		return new Response("Upstream fetch failed", { status: 502 });
	}
}
