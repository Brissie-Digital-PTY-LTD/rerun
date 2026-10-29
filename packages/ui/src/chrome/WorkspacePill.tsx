'use client'

import { useState, type ComponentProps } from 'react'
import { ChevronsUpDownIcon } from '../icons'
import { cn } from '../cn'
import { ChromePill } from './ChromeSurface'
import { Stripes } from '../primitives/stripes'

export type WorkspacePillProps = ComponentProps<'button'> & {
    name: string
    iconUrl: string
    fallbackIconUrl?: string
    stripes?: boolean
}

// Les enfants portent `relative` : les hachures sont un calque absolu, qui peint donc au-dessus du
// contenu resté en flux.
//
// L'icône peut venir du site de l'entreprise, donc d'un service tiers qui peut cesser de la servir :
// une image cassée à cet endroit se voit sur toutes les pages, d'où le repli au premier échec.
export function WorkspacePill({ name, iconUrl, fallbackIconUrl, stripes = false, className, ...props }: WorkspacePillProps) {
    const [failed, setFailed] = useState(false)
    const src = failed && fallbackIconUrl ? fallbackIconUrl : iconUrl

    // La pill est rendue côté serveur, donc une image déjà cassée a fini d'échouer avant que React
    // n'attache ses écouteurs : son `error` n'arrivera jamais, et seul l'état du noeud le dit.
    const catchFailedBeforeHydration = (node: HTMLImageElement | null) => {
        if (node?.complete && node.naturalWidth === 0) setFailed(true)
    }

    return (
        <ChromePill start="avatar" end="icon" className={className} {...props}>
            {stripes && <Stripes className="rounded-full" color="color-mix(in oklab, var(--foreground) 6%, transparent)" />}
            <img ref={catchFailedBeforeHydration} src={src} alt="" onError={() => setFailed(true)} className={cn('relative size-6 rounded-full shrink-0 object-cover', failed && !fallbackIconUrl && 'bg-muted')} />
            <span className="relative max-w-48 truncate">{name}</span>
            <ChevronsUpDownIcon className="relative size-4 text-muted-foreground shrink-0" />
        </ChromePill>
    )
}
