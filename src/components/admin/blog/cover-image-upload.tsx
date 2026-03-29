'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';
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
  label = 'Обложка',
  uploadLabel = 'Загрузить обложку',
  changeLabel = 'Изменить обложку'
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5 МБ');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      onChange(data.url);
    } catch {
      toast.error('Не удалось загрузить изображение');
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
      <p className="text-sm font-medium text-foreground">{label}</p>
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
            <Image
              src={value}
              alt="Обложка статьи"
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
                {changeLabel}
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
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
                <p className="text-sm text-center">{uploadLabel}</p>
                <p className="text-xs text-center opacity-60">PNG, JPG, WebP до 5 МБ</p>
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
