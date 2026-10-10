import { api } from "./api";
import { supabase } from "./supabase";

interface UploadAuthorization {
  provider: "cloudinary" | "s3" | "supabase";
  access: "PUBLIC" | "PRIVATE";
  uploadUrl: string;
  objectKey?: string;
  bucket?: string;
  uploadToken?: string;
  fields?: Record<string, string | number>;
}

interface RegisteredAsset {
  id: string;
  publicUrl?: string | null;
}

function uploadFailure(response: Response) {
  return new Error(`Media upload failed (${response.status}). Please try again.`);
}

export async function uploadPublicImage(
  file: File,
  purpose: "avatar" | "store" | "product" | "service",
): Promise<RegisteredAsset> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a valid image file.");
  }

  const authorization = await api.post<UploadAuthorization>(
    "/media/uploads/authorize",
    {
      filename: file.name,
      kind: "IMAGE",
      mimeType: file.type,
      bytes: file.size,
      purpose,
      access: "PUBLIC",
    },
  );

  if (authorization.provider === "cloudinary") {
    const form = new FormData();
    Object.entries(authorization.fields ?? {}).forEach(([key, value]) =>
      form.append(key, String(value)),
    );
    form.append("file", file);
    const response = await fetch(authorization.uploadUrl, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw uploadFailure(response);
    const uploaded = (await response.json()) as {
      public_id: string;
      version: number;
      signature: string;
      secure_url: string;
      bytes: number;
      width?: number;
      height?: number;
    };
    return api.post<RegisteredAsset>("/media/assets", {
      provider: "cloudinary",
      providerAssetId: uploaded.public_id,
      providerVersion: uploaded.version,
      providerSignature: uploaded.signature,
      access: "PUBLIC",
      publicUrl: uploaded.secure_url,
      kind: "IMAGE",
      mimeType: file.type,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
    });
  }

  if (!authorization.objectKey) {
    throw new Error("The upload destination was incomplete.");
  }
  const response = await fetch(authorization.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw uploadFailure(response);
  return api.post<RegisteredAsset>("/media/assets", {
    provider: "s3",
    providerAssetId: authorization.objectKey,
    access: "PUBLIC",
    kind: "IMAGE",
    mimeType: file.type,
    bytes: file.size,
  });
}

export async function uploadPrivateDocument(
  file: File,
  purpose: "kyc" | "dispute" = "kyc",
): Promise<RegisteredAsset> {
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Choose a PDF, PNG, or JPEG verification document.");
  }

  const authorization = await api.post<UploadAuthorization>(
    "/media/uploads/authorize",
    {
      filename: file.name,
      kind: "DOCUMENT",
      mimeType: file.type,
      bytes: file.size,
      purpose,
      access: "PRIVATE",
    },
  );

  if (authorization.provider === "supabase") {
    if (!supabase || !authorization.bucket || !authorization.objectKey || !authorization.uploadToken) {
      throw new Error("The secure upload destination was incomplete.");
    }
    const { error } = await supabase.storage
      .from(authorization.bucket)
      .uploadToSignedUrl(
        authorization.objectKey,
        authorization.uploadToken,
        file,
        { contentType: file.type },
      );
    if (error) throw new Error(`Secure document upload failed: ${error.message}`);
  } else {
    if (!authorization.objectKey) throw new Error("The upload destination was incomplete.");
    const response = await fetch(authorization.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw uploadFailure(response);
  }

  return api.post<RegisteredAsset>("/media/assets", {
    provider: authorization.provider,
    providerAssetId: authorization.objectKey,
    access: "PRIVATE",
    kind: "DOCUMENT",
    mimeType: file.type,
    bytes: file.size,
  });
}
