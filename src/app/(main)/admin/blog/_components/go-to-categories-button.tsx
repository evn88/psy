'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import Link from 'next/link';

export const GoToCategoriesButton = () => {
  return (
    <Button variant="outline" asChild>
      <Link href="/admin/blog/categories">
        <Pencil className="size-4 mr-1.5" />
        <span>Редактировать категории</span>
      </Link>
    </Button>
  );
};
