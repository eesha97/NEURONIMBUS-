export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { publicId } = body;

        if (!publicId) {
            return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
        }

        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result !== 'ok' && result.result !== 'not found') {
            throw new Error(`Cloudinary delete failed: ${result.result}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
