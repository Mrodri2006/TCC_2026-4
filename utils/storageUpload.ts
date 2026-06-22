import * as FileSystem from "expo-file-system/legacy";
import { auth, storage } from "../firebase";

export async function uploadImageUri(uri: string, caminho: string) {
  const usuario = auth.currentUser;
  if (!usuario) {
    throw new Error("Usuário não autenticado para enviar a imagem.");
  }

  const token = await usuario.getIdToken();
  const bucket = storage.ref().bucket;
  const endpoint =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o` +
    `?name=${encodeURIComponent(caminho)}`;
  const arquivo = await FileSystem.getInfoAsync(uri);

  if (!arquivo.exists) {
    throw new Error("O arquivo selecionado não está mais disponível no aparelho.");
  }

  const tamanho = Number(arquivo.size || 0);
  const inicio = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Firebase ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(tamanho),
      "X-Goog-Upload-Header-Content-Type": "image/jpeg",
    },
    body: JSON.stringify({ name: caminho, contentType: "image/jpeg" }),
  });

  if (!inicio.ok) {
    const detalhe = await inicio.text();
    if (inicio.status === 404) {
      throw new Error(
        "O Firebase Storage ainda não foi ativado para este projeto. Crie o bucket no Console Firebase."
      );
    }
    throw new Error(`Falha ao iniciar upload (${inicio.status}): ${detalhe}`);
  }

  const uploadUrl = inicio.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) {
    throw new Error("O Firebase não retornou uma URL para envio da imagem.");
  }

  const resposta = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    },
  });

  if (resposta.status < 200 || resposta.status >= 300) {
    let detalhe = resposta.body;
    try {
      const payload = JSON.parse(resposta.body);
      detalhe = payload?.error?.message || payload?.error || resposta.body;
    } catch {
      // Mantém a resposta original quando o servidor não retornar JSON.
    }
    throw new Error(`Falha no Firebase Storage (${resposta.status}): ${detalhe}`);
  }

  const metadata = JSON.parse(resposta.body || "{}");
  const ref = storage.ref(caminho);
  const url = await ref.getDownloadURL();

  return {
    snapshot: { bytesTransferred: Number(metadata.size || 0) },
    url,
  };
}
