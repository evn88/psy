'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PackageDialog } from './package-dialog';

export function CreatePackageButton() {
  return (
    <PackageDialog>
      <Button className="bg-[#900A0B] hover:bg-[#900A0B]/90 text-white">
        <Plus className="size-4 mr-1.5" />
        Создать пакет
      </Button>
    </PackageDialog>
  );
}
