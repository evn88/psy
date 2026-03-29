'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  slug: string;
  name: { ru: string; en?: string; sr?: string };
  postsCount: number;
}

interface CategoriesManagerProps {
  initialCategories: Category[];
}

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Форма создания
  const [newRu, setNewRu] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newSr, setNewSr] = useState('');

  // Форма редактирования
  const [editRu, setEditRu] = useState('');
  const [editEn, setEditEn] = useState('');
  const [editSr, setEditSr] = useState('');

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newRu.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameRu: newRu.trim(),
          nameEn: newEn.trim() || undefined,
          nameSr: newSr.trim() || undefined
        })
      });
      if (!res.ok) throw new Error();
      const cat = await res.json();
      setCategories(prev => [
        ...prev,
        { id: cat.id, slug: cat.slug, name: cat.name, postsCount: 0 }
      ]);
      setNewRu('');
      setNewEn('');
      setNewSr('');
      setCreating(false);
      toast.success('Категория создана');
    } catch {
      toast.error('Не удалось создать категорию');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditRu(cat.name.ru);
    setEditEn(cat.name.en ?? '');
    setEditSr(cat.name.sr ?? '');
  };

  const handleUpdate = async (id: string) => {
    if (!editRu.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameRu: editRu.trim(),
          nameEn: editEn.trim() || undefined,
          nameSr: editSr.trim() || undefined
        })
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCategories(prev => prev.map(c => (c.id === id ? { ...c, name: updated.name } : c)));
      setEditingId(null);
      toast.success('Категория обновлена');
    } catch {
      toast.error('Не удалось обновить категорию');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить категорию? Это не удалит статьи.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Категория удалена');
    } catch {
      toast.error('Не удалось удалить категорию');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Список категорий */}
      {categories.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground py-8 text-center">Категорий пока нет</p>
      )}

      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="bg-card border rounded-xl p-4">
            {editingId === cat.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Русский *</label>
                    <Input
                      value={editRu}
                      onChange={e => setEditRu(e.target.value)}
                      placeholder="Название RU"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">English</label>
                    <Input
                      value={editEn}
                      onChange={e => setEditEn(e.target.value)}
                      placeholder="Name EN"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Srpski</label>
                    <Input
                      value={editSr}
                      onChange={e => setEditSr(e.target.value)}
                      placeholder="Naziv SR"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(cat.id)}
                    disabled={loading || !editRu.trim()}
                    className="h-7 text-xs bg-[#900A0B] hover:bg-[#900A0B]/90 text-white"
                  >
                    <Check className="size-3 mr-1" /> Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-7 text-xs"
                  >
                    <X className="size-3 mr-1" /> Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Tag className="size-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-sm">{cat.name.ru}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat.name.en && (
                        <span className="text-xs text-muted-foreground">EN: {cat.name.en}</span>
                      )}
                      {cat.name.sr && (
                        <span className="text-xs text-muted-foreground">SR: {cat.name.sr}</span>
                      )}
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {cat.postsCount} ст.
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(cat)}
                    className="h-7 w-7 p-0"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cat.id)}
                    disabled={loading}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Форма создания */}
      {creating ? (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">Новая категория</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Русский *</label>
              <Input
                value={newRu}
                onChange={e => setNewRu(e.target.value)}
                placeholder="Название RU"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">English</label>
              <Input
                value={newEn}
                onChange={e => setNewEn(e.target.value)}
                placeholder="Name EN"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Srpski</label>
              <Input
                value={newSr}
                onChange={e => setNewSr(e.target.value)}
                placeholder="Naziv SR"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={loading || !newRu.trim()}
              className="h-7 text-xs bg-[#900A0B] hover:bg-[#900A0B]/90 text-white"
            >
              <Check className="size-3 mr-1" /> Создать
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewRu('');
                setNewEn('');
                setNewSr('');
              }}
              className="h-7 text-xs"
            >
              <X className="size-3 mr-1" /> Отмена
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreating(true)}
          className="w-full border-dashed h-9 text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-4 mr-2" /> Добавить категорию
        </Button>
      )}
    </div>
  );
}
