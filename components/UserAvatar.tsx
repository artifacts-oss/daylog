'use client';

import { ComponentPropsWithoutRef, CSSProperties, ElementRef, forwardRef } from 'react';
import { getUserInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type UserAvatarProps = Omit<ComponentPropsWithoutRef<typeof Avatar>, 'children'> & {
  name?: string | null;
  email?: string | null;
  profileImage?: string | null;
  userId?: number | null;
  imageSrc?: string;
  fallbackClassName?: string;
  fallbackStyle?: CSSProperties;
};

const UserAvatar = forwardRef<ElementRef<typeof Avatar>, UserAvatarProps>(function UserAvatar({
  name,
  email,
  profileImage,
  userId,
  imageSrc,
  className,
  fallbackClassName,
  fallbackStyle,
  ...props
}, ref) {
  const src = imageSrc || (profileImage && !profileImage.startsWith('data:') && userId
    ? `/api/v1/users/${userId}/avatar?v=${encodeURIComponent(profileImage.split(/[\\/]/).pop() || profileImage)}`
    : profileImage);
  return (
    <Avatar key={src || 'fallback'} ref={ref} className={className} {...props}>
      {src && (
        <AvatarImage
          src={src}
          alt={name || email || 'User'}
        />
      )}
      <AvatarFallback className={fallbackClassName} style={fallbackStyle}>
        {getUserInitials(name || email) || 'U'}
      </AvatarFallback>
    </Avatar>
  );
});

export default UserAvatar;
