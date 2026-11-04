import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// shadcn/ui Button with the supplied liquid-glass variant.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-normal cursor-pointer transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        glass: 'liquid-glass rounded-full text-foreground hover:scale-[1.03]',
      },
      size: {
        default: 'px-6 py-2.5 text-sm',
        hero: 'px-14 py-5 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'glass', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
