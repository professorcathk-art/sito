"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { BookingModal } from "@/components/booking-modal";
import { DigitalStorefront } from "@/components/storefront/digital-storefront";
import type { StorefrontBlock, StorefrontDesignState, StorefrontProductItem } from "@/types/storefront";

export type { StorefrontDesignState } from "@/types/storefront";

interface StorefrontViewProps {
  expertId: string;
  expertName: string;
  expertBio: string;
  expertTagline?: string;
  bioOverride?: string;
  avatarUrl?: string;
  verified: boolean;
  designState: StorefrontDesignState;
  customLinks: Array<{ title: string; url: string; icon?: string; order: number }>;
  website?: string;
  linkedin?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  storefrontBackgroundImageUrl?: string;
  storefrontSlug?: string;
  products: StorefrontProductItem[];
  blogPosts: Array<{
    id: string;
    title: string;
    description?: string;
    featured_image_url?: string;
    published_at: string;
  }>;
  hasAppointments: boolean;
  storefrontBlocks?: StorefrontBlock[];
  productsOnly?: boolean;
  /** Pro creators may hide the Powered by Sito footer */
  hidePoweredBy?: boolean;
  navSlot?: React.ReactNode;
  postsOnly?: boolean;
}

export function StorefrontView({
  expertId,
  expertName,
  expertBio,
  expertTagline,
  bioOverride,
  avatarUrl,
  verified,
  designState,
  customLinks,
  website,
  linkedin,
  instagramUrl,
  tiktokUrl,
  twitterUrl,
  youtubeUrl,
  storefrontBackgroundImageUrl,
  storefrontSlug,
  products,
  blogPosts,
  hasAppointments,
  storefrontBlocks = [],
  productsOnly = false,
  hidePoweredBy = false,
  navSlot,
  postsOnly = false,
}: StorefrontViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openBookingModal, setOpenBookingModal] = useState(false);
  const [initialSlotId, setInitialSlotId] = useState<string | null>(null);
  const [isReturningFromLogin, setIsReturningFromLogin] = useState(false);

  useEffect(() => {
    if (searchParams.get("openBooking") === "1") {
      setIsReturningFromLogin(true);
      try {
        const saved = typeof window !== "undefined" ? sessionStorage.getItem("sito_pending_booking") : null;
        if (saved) {
          const data = JSON.parse(saved);
          if (data.slotId && data.expertId === expertId) {
            setInitialSlotId(data.slotId);
          }
        }
      } catch {
        /* ignore */
      }
      setOpenBookingModal(true);
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, expertId, router]);

  return (
    <>
      <DigitalStorefront
        expertId={expertId}
        expertName={expertName}
        expertBio={expertBio}
        expertTagline={expertTagline}
        bioOverride={bioOverride}
        avatarUrl={avatarUrl}
        verified={verified}
        designState={designState}
        socialLinks={{ website, linkedin, instagramUrl, tiktokUrl, twitterUrl, youtubeUrl }}
        storefrontBackgroundImageUrl={storefrontBackgroundImageUrl}
        storefrontSlug={storefrontSlug}
        products={products}
        blogPosts={productsOnly ? [] : blogPosts}
        hasAppointments={hasAppointments}
        storefrontBlocks={storefrontBlocks}
        customLinks={customLinks}
        currentUserId={user?.id}
        productsOnly={productsOnly}
        postsOnly={postsOnly}
        hidePoweredBy={hidePoweredBy}
        navSlot={navSlot}
        onBookMe={() => setOpenBookingModal(true)}
      />
      {openBookingModal && hasAppointments && (
        <BookingModal
          expertId={expertId}
          expertName={expertName}
          product={null}
          onClose={() => {
            setOpenBookingModal(false);
            setInitialSlotId(null);
            setIsReturningFromLogin(false);
          }}
          initialSlotId={initialSlotId}
          isReturningFromLogin={isReturningFromLogin}
        />
      )}
    </>
  );
}
