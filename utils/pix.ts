type PixPayloadParams = {
  pixKey: string;
  receiverName: string;
  receiverCity: string;
  amount: number;
  txid: string;
  description?: string;
};

const onlyAscii = (value: string, maxLength: number) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);

const field = (id: string, value: string) => {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
};

const crc16 = (payload: string) => {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export const buildPixTxid = (uid: string) =>
  `MENS${uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}${String(Date.now()).slice(-8)}`.slice(0, 25);

export const buildPixPayload = ({
  pixKey,
  receiverName,
  receiverCity,
  amount,
  txid,
  description,
}: PixPayloadParams) => {
  const key = pixKey.trim();
  if (!key || key === "SUA_CHAVE_PIX_AQUI") {
    throw new Error("Configure a chave Pix do administrador em utils/billingConfig.ts.");
  }

  const merchantAccountInfo = field("00", "br.gov.bcb.pix") + field("01", key) + (description ? field("02", onlyAscii(description, 72)) : "");
  const additionalData = field("05", onlyAscii(txid || "***", 25) || "***");
  const payloadWithoutCrc =
    field("00", "01") +
    field("26", merchantAccountInfo) +
    field("52", "0000") +
    field("53", "986") +
    field("54", Number(amount || 0).toFixed(2)) +
    field("58", "BR") +
    field("59", onlyAscii(receiverName, 25) || "RECEBEDOR") +
    field("60", onlyAscii(receiverCity, 15) || "BRASIL") +
    field("62", additionalData) +
    "6304";

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
};
