'use client';

import { useState, useRef, useTransition, useCallback } from 'react';
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
} from '@/components/ui/alert-dialog';
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
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  CloudUpload,
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Pencil,
  MoreHorizontal,
  Info,
  Lock,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteUserDocument, renameUserDocument } from '../_actions/documents.actions';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE_BYTES } from '@/configs/files';

type Document = {
  id: string;
  name: string;
  fileType: string;
  size: number | null;
  createdAt: Date;
  uploadedById: string;
};

type Props = {
  userId: string;
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
  if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
  if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const getFileAccent = (fileType: string) => {
  if (fileType.startsWith('image/')) return 'text-blue-500 bg-blue-500/10';
  if (fileType === 'application/pdf') return 'text-red-500 bg-red-500/10';
  return 'text-primary bg-primary/10';
};

const FileRow = ({
  doc,
  canDelete,
  onDeleted,
  onRenamed
}: {
  doc: Document;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(doc.name);
  const [isPending, startTransition] = useTransition();

  const accent = getFileAccent(doc.fileType);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUserDocument(doc.id);
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
      const result = await renameUserDocument(doc.id, trimmed);
      if (result.success) {
        toast.success('Файл переименован');
        onRenamed(doc.id, trimmed);
        setIsRenaming(false);
      } else {
        toast.error(result.error ?? 'Не удалось переименовать');
      }
    });
  };

  return (
    <>
      <div className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
        {/* Иконка типа файла */}
        <div className={`p-2 rounded-md shrink-0 ${accent}`}>
          {getFileIconElement(doc.fileType)}
        </div>

        {/* Информация */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-tight">{doc.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatSize(doc.size)} · {formatDate(doc.createdAt)}
          </p>
        </div>

        {/* Меню действий */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
              disabled={isPending}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => window.open(`/api/documents/${doc.id}`, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setNewName(doc.name);
                setIsRenaming(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Переименовать
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={e => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить файл?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Файл «{doc.name}» будет удалён без возможности восстановления.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Диалог переименования */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать файл</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Отмена
            </Button>
            <Button onClick={handleRename} disabled={isPending}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const MyDocuments = ({ userId, documents: initialDocs }: Props) => {
  const [docs, setDocs] = useState(initialDocs);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myFiles = docs.filter(d => d.uploadedById === userId);
  const adminFiles = docs.filter(d => d.uploadedById !== userId);

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

      // Имитация прогресса пока идёт загрузка
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 15, 85));
      }, 300);

      try {
        const formData = new FormData();
        formData.append('file', file);

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
            uploadedById: userId
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
    [userId]
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5 text-primary" />
            Мои файлы
          </CardTitle>
          <CardDescription>
            Загружайте документы, которые помогут специалисту лучше понять вашу ситуацию.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Баннер безопасности */}
          <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Ваши данные надёжно защищены</p>
              <p className="text-xs text-muted-foreground">
                Все файлы шифруются по алгоритму{' '}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted">AES-256-GCM</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-56 text-center">
                    Военный стандарт шифрования. Файл зашифровывается до отправки на сервер и
                    расшифровывается только при скачивании.
                  </TooltipContent>
                </Tooltip>{' '}
                перед сохранением. Доступ — только у вас и вашего специалиста.
              </p>
            </div>
          </div>

          {/* Зона загрузки drag-and-drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`
              relative flex cursor-pointer flex-col items-center justify-center gap-3
              rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200
              ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }
              ${isUploading ? 'pointer-events-none' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_DOCUMENT_TYPES.join(',')}
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              className={`rounded-full p-3 transition-colors ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}
            >
              <CloudUpload
                className={`h-6 w-6 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </div>

            {isUploading ? (
              <div className="w-full max-w-xs space-y-2">
                <p className="text-sm font-medium">Шифрование и загрузка…</p>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium">
                    {isDragging ? 'Отпустите файл' : 'Перетащите файл или нажмите для выбора'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPEG, PNG, WebP, DOC, DOCX · до {MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}{' '}
                    МБ
                  </p>
                </div>
                <Button size="sm" variant="outline" tabIndex={-1} className="pointer-events-none">
                  Выбрать файл
                </Button>
              </>
            )}
          </div>

          {/* Уведомление о согласии */}
          <div className="flex gap-2 rounded-lg border border-border/50 bg-card/40 px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Загружая файлы, вы соглашаетесь на их обработку в рамках{' '}
              <a
                href="/documents/personal-data-consent.pdf"
                target="_blank"
                className="underline hover:text-foreground transition-colors"
              >
                Политики конфиденциальности
              </a>
              .
            </p>
          </div>

          {/* Списки файлов */}
          {(myFiles.length > 0 || adminFiles.length > 0) && (
            <div className="space-y-4 pt-1">
              {/* Мои файлы */}
              {myFiles.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Загружены мной
                    </span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {myFiles.length}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <ScrollArea className={myFiles.length > 5 ? 'h-72' : undefined}>
                      <div className="p-1">
                        {myFiles.map((doc, i) => (
                          <div key={doc.id}>
                            <FileRow
                              doc={doc}
                              canDelete
                              onDeleted={handleDeleted}
                              onRenamed={handleRenamed}
                            />
                            {i < myFiles.length - 1 && <Separator className="mx-3 w-auto" />}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Файлы от специалиста */}
              {adminFiles.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      От специалиста
                    </span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {adminFiles.length}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <ScrollArea className={adminFiles.length > 5 ? 'h-72' : undefined}>
                      <div className="p-1">
                        {adminFiles.map((doc, i) => (
                          <div key={doc.id}>
                            <FileRow
                              doc={doc}
                              canDelete={false}
                              onDeleted={handleDeleted}
                              onRenamed={handleRenamed}
                            />
                            {i < adminFiles.length - 1 && <Separator className="mx-3 w-auto" />}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          )}

          {docs.length === 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              Файлов пока нет — загрузите первый документ.
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
