export function formatDate(value) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; const now = new Date(); return date.toDateString() === now.toDateString() ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : date.toLocaleDateString([], { month: "short", day: "numeric" }); }
export function fullDate(value) { if (!value) return "Date unavailable"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
export function displaySender(email) { if (!email) return "Unknown sender"; const match = email.match(/^\s*(.*?)\s*<([^>]+)>/); return match?.[1]?.replace(/^"|"$/g, "") || match?.[2] || email; }
export function readableBody(value) {
	if (!value) return "";
	return value
		.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/https?:\/\/[^\s)]+/gi, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/[ \t]+/g, " ")
		.replace(/\s*\(\s*\)\s*/g, " ")
		.replace(/\n\s*\n+/g, "\n\n")
		.trim();
}
