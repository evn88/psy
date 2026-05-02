'use client';

import { useState, useRef, useTransition, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/AlertDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  CloudUpload,
  FileText,
  FileImage,
  File,
  Trash2,
  Pencil,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteClientDocument, renameClientDocument } from '../../_actions/clients.actions';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/config/files';

type Document = {
  id: string;
  name: string;
  fileType: string;
  size: number | null;
  createdAt: Date;
  uploadedById: string;
  uploadedBy: { name: string | null; email: string };
};

type Props = {
  clientId: string;
  documents: Document[];
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

const getFileIconElement = (fileType: string) => {
  if (fileType.startsWith('image/')) return <FileImage className="h-6 w-6" />;
  if (fileType === 'application/pdf') return <FileText className="h-6 w-6" />;
  return <File className="h-6 w-6" />;
};

const getFileAccent = (fileType: string) => {
  if (fileType.startsWith('image/')) return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
  if (fileType === 'application/pdf') return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
  return 'text-primary bg-primary/10 border-primary/20';
};

const FileRow = ({
  doc,
  clientId,
  onDeleted,
  onRenamed
}: {
  doc: Document;
  clientId: string;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(doc.name);
  const [isPending, startTransition] = useTransition();

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const accent = getFileAccent(doc.fileType);

  const handleDownload = async (e: React.MouseEvent) => {
    if (downloadUrl) return;
    e.preventDefault();
    if (isDownloading) return;

    setIsDownloading(true);
    const toastId = toast.loading(`Подготовка файла «${doc.name}»...`);

    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error('Ошибка скачивания');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      setTimeout(() => {
        downloadRef.current?.click();
        toast.success('Загрузка началась', { id: toastId });
        setIsDownloading(false);
      }, 50);
    } catch {
      toast.error('Не удалось скачать файл', { id: toastId });
      setIsDownloading(false);
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteClientDocument(doc.id, clientId);
      if (result.success) {
        toast.success('Файл удалён');
        onDeleted(doc.id);
      } else {
        toast.error(result.error ?? 'Не удалось удалить файл');
      }
    });
  };

  const handleRename = () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === doc.name) {
      setIsRenaming(false);
      return;
    }
    startTransition(async () => {
      const result = await renameClientDocument(doc.id, trimmed, clientId);
      if (result.success) {
        toast.success('Файл переименован');
        onRenamed(doc.id, trimmed);
        setIsRenaming(false);
      } else {
        toast.error(result.error ?? 'Не удалось переименовать');
      }
    });
  };

  const uploaderLabel = doc.uploadedBy.name || doc.uploadedBy.email || '—';

  return (
    <>
      <div className="group relative flex items-center gap-3 p-2.5 rounded-2xl border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
        {/* Иконка типа файла */}
        <div
          className={cn(
            'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105 duration-500 shadow-sm border-2 border-transparent',
            accent,
            'group-hover:border-current/20 group-hover:shadow-md'
          )}
        >
          {isDownloading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            getFileIconElement(doc.fileType)
          )}
        </div>

        {/* Информация */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <a
            href={downloadUrl || `/api/documents/${doc.id}`}
            download={doc.name}
            onClick={handleDownload}
            className={cn(
              'block text-sm font-bold leading-tight tracking-tight text-foreground/90 transition-colors line-clamp-2 word-break-break-all cursor-pointer',
              isDownloading
                ? 'opacity-50 pointer-events-none'
                : 'group-hover:text-primary hover:underline'
            )}
          >
            {doc.name}
          </a>
          <a ref={downloadRef} href={downloadUrl} download={doc.name} className="hidden" />
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em]">
            <span className="bg-muted/50 px-1.5 py-0.5 rounded-md">{formatSize(doc.size)}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{formatDate(doc.createdAt)}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="truncate max-w-[150px]">{uploaderLabel}</span>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all duration-300">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg data-[state=open]:bg-muted hover:bg-muted transition-colors"
                disabled={isPending}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-2xl shadow-2xl border-2 p-1.5 animate-in zoom-in-95 duration-200"
            >
              <DropdownMenuItem
                className="rounded-xl gap-3 py-2.5 px-3 focus:bg-primary/5 focus:text-primary transition-colors cursor-pointer"
                onClick={() => {
                  setNewName(doc.name);
                  setIsRenaming(true);
                }}
              >
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <Pencil className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs uppercase tracking-widest">Переименовать</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="rounded-xl gap-3 py-2.5 px-3 text-destructive focus:text-destructive focus:bg-destructive/5 transition-colors cursor-pointer"
                    onSelect={e => e.preventDefault()}
                  >
                    <div className="p-1.5 rounded-lg bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">Удалить</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl border-2">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить этот файл?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Файл «<span className="font-bold text-foreground">{doc.name}</span>» будет
                      удалён навсегда. Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                    >
                      Да, удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Диалог переименования */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle>Новое название</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              placeholder="Введите название..."
              className="h-11 rounded-xl focus-visible:ring-primary/20"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRenaming(false)}
              className="rounded-xl h-10 px-6"
            >
              Отмена
            </Button>
            <Button
              onClick={handleRename}
              disabled={isPending}
              className="rounded-xl h-10 px-6 shadow-lg shadow-primary/20"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const ClientDocuments = ({ clientId, documents: initialDocs }: Props) => {
  const [docs, setDocs] = useState(initialDocs);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientFiles = docs.filter(d => d.uploadedById === clientId);
  const adminFiles = docs.filter(d => d.uploadedById !== clientId);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
        toast.error('Недопустимый тип файла. Разрешены: PDF, изображения, DOC/DOCX');
        return;
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        toast.error(`Максимальный размер файла — ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} МБ`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 15, 85));
      }, 300);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetUserId', clientId);

        const res = await fetch('/api/documents', { method: 'POST', body: formData });
        clearInterval(progressInterval);
        setUploadProgress(100);

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Ошибка загрузки');
          return;
        }

        toast.success('Файл загружен и зашифрован');
        setDocs(prev => [
          {
            id: data.id,
            name: data.name,
            fileType: file.type,
            size: file.size,
            createdAt: new Date(),
            uploadedById: data.uploadedById ?? '',
            uploadedBy: { name: 'Вы', email: '' }
          },
          ...prev
        ]);
      } finally {
        clearInterval(progressInterval);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 600);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [clientId]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDeleted = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));
  const handleRenamed = (id: string, name: string) =>
    setDocs(prev => prev.map(d => (d.id === id ? { ...d, name } : d)));

  return (
    <TooltipProvider>
      <div className="w-full max-w-none grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
        {/* Левая колонка: Загрузка и безопасность */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-2 shadow-sm bg-gradient-to-b from-background to-muted/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CloudUpload className="h-5 w-5 text-primary" />
                Загрузить клиенту
              </CardTitle>
              <CardDescription>Добавьте новые документы в профиль клиента</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Зона загрузки */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={cn(
                  'relative flex cursor-pointer flex-col items-center justify-center gap-4',
                  'rounded-3xl border-2 border-dashed px-4 py-10 text-center transition-all duration-500',
                  'group overflow-hidden bg-muted/10',
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_40px_-10px_rgba(var(--primary),0.3)]'
                    : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20',
                  isUploading && 'pointer-events-none opacity-50'
                )}
              >
                {/* Фоновое свечение при Drag */}
                {isDragging && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_DOCUMENT_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div
                  className={cn(
                    'rounded-full p-4 transition-all duration-700 shadow-sm',
                    isDragging
                      ? 'bg-primary text-primary-foreground scale-110 rotate-12'
                      : 'bg-background border-2 border-muted text-muted-foreground group-hover:border-primary/40 group-hover:text-primary'
                  )}
                >
                  <CloudUpload className="h-8 w-8" />
                </div>

                {isUploading ? (
                  <div className="w-full max-w-[200px] space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                      Загрузка...
                    </p>
                    <Progress value={uploadProgress} className="h-1.5 shadow-inner" />
                  </div>
                ) : (
                  <div className="space-y-3 relative z-10">
                    <div className="space-y-1">
                      <p className="text-sm font-bold tracking-tight">
                        {isDragging ? 'Отпустите файл' : 'Выберите файл'}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[180px] mx-auto">
                        PDF, JPEG, WebP, DOCX до {MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} МБ
                      </p>
                    </div>
                    <Button
                      size="default"
                      variant="default"
                      className={cn(
                        'mt-1 h-9 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300',
                        'bg-primary text-primary-foreground shadow-[0_8px_15px_-8px_rgba(var(--primary),0.5)]',
                        'group-hover:scale-105 group-hover:shadow-[0_12px_20px_-8px_rgba(var(--primary),0.6)] active:scale-95'
                      )}
                    >
                      Обзор
                    </Button>
                  </div>
                )}
              </div>

              {/* Баннер безопасности */}
              <div className="relative overflow-hidden rounded-2xl border bg-card/50 p-5 group shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0 duration-700">
                  <ShieldCheck className="h-16 w-16" />
                </div>
                <div className="flex gap-4 relative z-10">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 h-fit shadow-inner">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Безопасность AES-256</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Все файлы зашифрованы алгоритмом AES-256-GCM.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка: Список файлов */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-2 shadow-sm flex flex-col h-full min-h-[600px] overflow-hidden">
            <CardHeader className="border-b bg-muted/5 py-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Хранилище
                  </CardTitle>
                  <CardDescription>Загруженные документы и материалы</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="h-7 px-3 text-[10px] font-black uppercase tracking-wider bg-background shadow-xs"
                >
                  {docs.length} объектов
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                  {docs.length > 0 ? (
                    <>
                      {/* Мои файлы (клиента) */}
                      {clientFiles.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                              От клиента
                            </span>
                          </div>
                          <div className="grid gap-2">
                            {clientFiles.map(doc => (
                              <FileRow
                                key={doc.id}
                                doc={doc}
                                clientId={clientId}
                                onDeleted={handleDeleted}
                                onRenamed={handleRenamed}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Линия разделения если есть оба типа */}
                      {clientFiles.length > 0 && adminFiles.length > 0 && (
                        <Separator className="opacity-50" />
                      )}

                      {/* Файлы от специалиста */}
                      {adminFiles.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                              Ваши файлы
                            </span>
                          </div>
                          <div className="grid gap-2">
                            {adminFiles.map(doc => (
                              <FileRow
                                key={doc.id}
                                doc={doc}
                                clientId={clientId}
                                onDeleted={handleDeleted}
                                onRenamed={handleRenamed}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground space-y-4">
                      <div className="p-6 rounded-full bg-muted/30">
                        <FileText className="h-12 w-12 opacity-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Файлы не найдены</p>
                        <p className="text-xs opacity-60">Загруженные документы появятся здесь</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};
