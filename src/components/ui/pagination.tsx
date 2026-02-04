import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const paginationVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-2.5',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'default',
    },
  }
);

interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {}

const Pagination = ({ className, ...props }: PaginationProps) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);

interface PaginationContentProps extends React.HTMLAttributes<HTMLUListElement> {}

const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
);
PaginationContent.displayName = 'PaginationContent';

interface PaginationItemProps
  extends React.ComponentPropsWithoutRef<'li'> {}

const PaginationItem = (props: PaginationItemProps) => <li {...props} />;

interface PaginationLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof paginationVariants> {
  isActive?: boolean;
}

const PaginationLink = ({
  className,
  isActive,
  variant = 'outline',
  size = 'icon',
  ...props
}: PaginationLinkProps) => (
  <a
    className={cn(
      paginationVariants({ variant, size, className }),
      isActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
    )}
    aria-current={isActive ? 'page' : undefined}
    {...props}
  />
);

interface PaginationButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof paginationVariants> {
  isActive?: boolean;
}

const PaginationButton = React.forwardRef<HTMLButtonElement, PaginationButtonProps>(
  ({ className, isActive, variant = 'outline', size = 'icon', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        paginationVariants({ variant, size, className }),
        isActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
      )}
      {...props}
    />
  )
);
PaginationButton.displayName = 'PaginationButton';

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationButton,
};
