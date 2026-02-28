import multer from "multer";

const memoryStorage = multer.memoryStorage();

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya JPEG, PNG, GIF, dan WebP yang diperbolehkan"), false);
  }
};

export const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024 },
});
