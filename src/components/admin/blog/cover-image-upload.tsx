'use client';

import { useRef, useState } from 'react';
import NextImage from 'next/image';
import { Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CoverImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  uploadLabel?: string;
  changeLabel?: string;
}

export function CoverImageUpload({
  value,
  onChange,
  label,
  uploadLabel,
  changeLabel
}: CoverImageUploadProps) {
  const tCover = useTranslations('Admin.blog.editor.cover');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resolvedLabel = label ?? tCover('label');
  const resolvedUploadLabel = uploadLabel ?? tCover('upload');
  const resolvedChangeLabel = changeLabel ?? tCover('change');

  const deleteBlob = async (url: string) => {
    try {
      await fetch(`/api/upload/delete?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
    } catch {
      return;
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(tCover('invalidFile'));
      return;
    }

    setUploading(true);
    try {
      // Сжатие на клиенте через Canvas (Native API)
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = e => {
          const img = new globalThis.Image();
          img.src = e.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            // Для отличного качества на 4K/UltraHD (3840px)
            const MAX_WIDTH = 3840;
            const ratio = Math.min(MAX_WIDTH / img.width, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Включаем высококачественное сглаживание
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              blob => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas conversion failed'));
              },
              'image/webp',
              0.9 // Повышенное качество для четкости на больших экранах
            );
          };
          img.onerror = () => reject(new Error('Image load failed'));
        };
        reader.onerror = () => reject(new Error('File read failed'));
      });

      const form = new FormData();
      form.append('file', compressedBlob, 'cover.webp');

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();

      // Удаляем старый файл, если он был
      if (value) {
        await deleteBlob(value);
      }

      onChange(data.url);
    } catch {
      toast.error(tCover('uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{resolvedLabel}</p>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden transition-colors',
          dragOver ? 'border-[#900A0B] bg-[#900A0B]/5' : 'border-border',
          !value && 'cursor-pointer hover:border-[#900A0B]/60'
        )}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !value && inputRef.current?.click()}
      >
        {value ? (
          <div className="relative">
            <NextImage
              src={value}
              alt={tCover('imageAlt')}
              width={600}
              height={300}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="bg-white text-[#03070A] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                {resolvedChangeLabel}
              </button>
              <button
                type="button"
                onClick={async e => {
                  e.stopPropagation();
                  if (value) {
                    await deleteBlob(value);
                  }
                  onChange(null);
                }}
                className="bg-white text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-36 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4">
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-[#900A0B]" />
            ) : (
              <>
                <Upload className="size-8" />
                <p className="text-sm text-center">{resolvedUploadLabel}</p>
                <p className="text-xs text-center opacity-60">{tCover('hint')}</p>
              </>
            )}
          </div>
        )}
        {uploading && value && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
