'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateClientAvatar } from '../../_actions/clients.actions';

interface ClientAvatarProps {
  userId: string;
  name: string | null;
  image: string | null;
}

export function ClientAvatar({ userId, name, image }: ClientAvatarProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5 МБ');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при загрузке фото');
      }

      const { url } = await response.json();

      const updateRes = await updateClientAvatar(userId, url);
      if (updateRes.success) {
        toast.success('Фото профиля обновлено');
      } else {
        throw new Error(updateRes.error || 'Ошибка при сохранении профиля');
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Произошла неизвестная ошибка');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative group">
      <Avatar
        className="h-16 w-16 md:h-20 md:w-20 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <AvatarImage src={image || ''} />
        <AvatarFallback className="text-2xl">{name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
      </Avatar>

      <div
        className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : (
          <Camera className="h-6 w-6 text-white" />
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
