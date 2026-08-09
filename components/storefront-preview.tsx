"use client";

import { DigitalStorefront } from "@/components/storefront/digital-storefront";
import type { StorefrontBlock, StorefrontDesignState, StorefrontProductItem } from "@/types/storefront";

export type DesignState = StorefrontDesignState;

interface StorefrontPreviewProps {
  designState: StorefrontDesignState;
  customLinks: Array<{ title: string; url: string; icon?: string; order: number }>;
  showProducts: boolean;
  showAppointments: boolean;
  showBlog: boolean;
  bioOverride?: string;
  expertName: string;
  expertBio: string;
  expertAvatar?: string;
  verified: boolean;
  products: StorefrontProductItem[];
  storefrontBlocks?: StorefrontBlock[];
  profileData?: {
    name: string;
    title: string;
    bio: string;
    avatarUrl: string;
    website?: string;
    linkedin?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    twitterUrl?: string;
    youtubeUrl?: string;
    customSlug?: string;
    heroOverlayOpacity?: number;
    heroOverlayColor?: string;
    storefrontBackgroundImageUrl?: string;
  };
}

export function StorefrontPreview({
  designState,
  customLinks,
  showProducts,
  showAppointments,
  bioOverride,
  expertName,
  expertBio,
  expertAvatar,
  verified,
  products,
  storefrontBlocks,
  profileData,
}: StorefrontPreviewProps) {
  const name = profileData?.name || expertName;
  const bio = profileData?.bio ?? expertBio;
  const avatar = profileData?.avatarUrl || expertAvatar;
  const tagline = profileData?.title;

  const displayedProducts = showProducts ? products : [];

  // Ensure preview always shows a coherent digital-storefront structure
  const blocks =
    storefrontBlocks && storefrontBlocks.length > 0
      ? storefrontBlocks
      : ([
          {
            id: "preview-header",
            type: "header",
            order: 0,
            data: { name, tagline, bio: bioOverride || bio, avatarUrl: avatar },
          },
          ...(displayedProducts.length > 0
            ? [{ id: "preview-products", type: "products" as const, order: 1, data: { showProducts: true, displayMode: "inline" } }]
            : []),
        ] as StorefrontBlock[]);

  return (
    <div className="sticky top-4 flex justify-center min-w-0">
      <div className="relative w-[375px] min-w-[375px] h-[812px] bg-slate-800 rounded-[2.5rem] p-2 shadow-2xl flex-shrink-0">
        <div className="absolute top-0 left-1/2 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-800" aria-hidden />
        <div className="relative h-full w-full min-w-[343px] overflow-y-auto overflow-x-hidden rounded-[2rem] bg-slate-950">
          <DigitalStorefront
            expertId="preview"
            expertName={name}
            expertBio={bio}
            expertTagline={tagline}
            bioOverride={bioOverride}
            avatarUrl={avatar}
            verified={verified}
            designState={designState}
            socialLinks={{
              website: profileData?.website,
              linkedin: profileData?.linkedin,
              instagramUrl: profileData?.instagramUrl,
              tiktokUrl: profileData?.tiktokUrl,
              twitterUrl: profileData?.twitterUrl,
              youtubeUrl: profileData?.youtubeUrl,
            }}
            storefrontBackgroundImageUrl={
              profileData?.storefrontBackgroundImageUrl || designState.backgroundImageUrl
            }
            storefrontSlug={profileData?.customSlug}
            heroOverlayOpacity={profileData?.heroOverlayOpacity}
            heroOverlayColor={profileData?.heroOverlayColor}
            products={displayedProducts}
            hasAppointments={showAppointments}
            storefrontBlocks={blocks}
            customLinks={customLinks}
            isPreview
          />
        </div>
      </div>
    </div>
  );
}
