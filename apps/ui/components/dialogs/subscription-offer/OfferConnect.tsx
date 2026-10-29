'use client'

import { SUBSCRIPTION_PROVIDERS, type SubscriptionProvider } from '@/components/agent/ModelPickerProviders'
import { Button } from '@/components/ui/button'
import { ProviderIcon } from '@/lib/engine/provider-icons'
import { KeyIcon } from '@/lib/icons'

import { KeyLogos, PLANS } from './offer-plans'

// Each plan sits in a frame of its own, and the only filled surface of the column is the Connect
// button inside it. The API key is not a third plan: it hangs under a divider, in outline.
export function OfferConnect({ onPick, onKey }: { onPick: (provider: SubscriptionProvider) => void; onKey: () => void }) {
    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
                {SUBSCRIPTION_PROVIDERS.map(provider => (
                    <div key={provider} className="flex flex-col items-center gap-3 rounded-lg border bg-muted/20 p-4">
                        <ProviderIcon provider={provider} className="size-6" />
                        <span className="text-sm font-medium">{PLANS[provider].plan}</span>
                        <Button className="w-full" onClick={() => onPick(provider)}>
                            Connect
                        </Button>
                    </div>
                ))}
            </div>
            <OrDivider />
            <Button variant="outline" className="w-full" onClick={onKey}>
                <KeyIcon />
                Use an API key
                <KeyLogos />
            </Button>
        </div>
    )
}

// Same divider as AuthMethods, for the same reason: what follows is the other road, not the next item.
function OrDivider() {
    return (
        <div className="my-1 flex items-center gap-2 text-xs uppercase">
            <span className="flex-1 border-t" />
            <span className="text-muted-foreground">or</span>
            <span className="flex-1 border-t" />
        </div>
    )
}
