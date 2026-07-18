'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PackageDialog } from './package-dialog';
import type { ComponentProps } from 'react';

type EditablePackage = NonNullable<ComponentProps<typeof PackageDialog>['pkg']>;

export function EditPackageButton({ pkg }: { pkg: EditablePackage }) {
  return (
    <PackageDialog pkg={pkg}>
      <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Редактировать">
        <Pencil className="size-3.5" />
        <span className="hidden sm:inline">Редактировать</span>
      </Button>
    </PackageDialog>
  );
}
