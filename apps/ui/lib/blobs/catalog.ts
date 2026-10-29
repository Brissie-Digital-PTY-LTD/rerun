export type BlobColor =
    | 'amber'
    | 'green'
    | 'blue'
    | 'purple'
    | 'magenta'
    | 'pink'
    | 'coral'
    | 'pastel'
    | 'iridescent'
    | 'red'

export type BlobForm = 'blob' | 'bloom' | 'knot' | 'crystal' | 'vortex' | 'smoke' | 'crumple'

export type BlobIllustration = {
    file: string
    desc: string
    color: BlobColor
    form: BlobForm
    url: string
}

const BLOB_BUCKET = 'blob-illustrations'

export function blobUrl(file: string): string {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BLOB_BUCKET}/${file}`
}

type BlobEntry = Omit<BlobIllustration, 'url'>

const ENTRIES: readonly BlobEntry[] = [
    { file: 'green-energy-blob.webp', desc: 'Black glass sculpture pierced by a cross of green energy', color: 'green', form: 'blob' },
    { file: 'purple-lime-bloom.webp', desc: 'Crumpled flower in dark purple and lime green', color: 'purple', form: 'bloom' },
    { file: 'iridescent-crystal-cluster.webp', desc: 'Cluster of faceted holographic pastel crystals', color: 'iridescent', form: 'crystal' },
    { file: 'blue-vortex-ring.webp', desc: 'Twisted blue glass vortex ring', color: 'blue', form: 'vortex' },
    { file: 'magenta-fluid-blob.webp', desc: 'Glossy fluid blob in magenta red', color: 'magenta', form: 'blob' },
    { file: 'amber-fluid-blob.webp', desc: 'Glossy fluid blob in caramel orange', color: 'amber', form: 'blob' },
    { file: 'blue-plasma-blob.webp', desc: 'Smoking electric-blue plasma blob', color: 'blue', form: 'blob' },
    { file: 'amber-torus-knot.webp', desc: 'Orange torus knot with dark iridescent reflections', color: 'amber', form: 'knot' },
    { file: 'violet-lime-blob.webp', desc: 'Glossy blob in purple and lime green', color: 'purple', form: 'blob' },
    { file: 'green-foil-crumple.webp', desc: 'Crumpled metallic dark-green foil', color: 'green', form: 'crumple' },
    { file: 'coral-iridescent-bloom.webp', desc: 'Crumpled iridescent flower in coral red-orange', color: 'coral', form: 'bloom' },
    { file: 'amber-glass-knot.webp', desc: 'Amber-orange and black glass knot', color: 'amber', form: 'knot' },
    { file: 'pastel-rainbow-knot.webp', desc: 'Pastel rainbow torus knot', color: 'pastel', form: 'knot' },
    { file: 'pastel-iridescent-blob.webp', desc: 'Crumpled iridescent blob in pastel pink and mint', color: 'pastel', form: 'blob' },
    { file: 'amber-ink-smoke.webp', desc: 'Swirls of orange and red ink', color: 'amber', form: 'smoke' },
    { file: 'blue-glass-blob.webp', desc: 'Translucent glossy blue glass blob', color: 'blue', form: 'blob' },
    { file: 'amber-iridescent-bloom.webp', desc: 'Crumpled iridescent amber-orange flower', color: 'amber', form: 'bloom' },
    { file: 'violet-lime-knot.webp', desc: 'Loops of purple and lime-green glass', color: 'purple', form: 'knot' },
    { file: 'dark-lime-blob.webp', desc: 'Glossy black blob veined with lime green', color: 'green', form: 'blob' },
    { file: 'violet-ribbon-blob.webp', desc: 'Blob of glossy purple ribbons', color: 'purple', form: 'blob' },
    { file: 'amber-black-smoke.webp', desc: 'Swirls of orange and black smoke', color: 'amber', form: 'smoke' },
    { file: 'violet-crystal.webp', desc: 'Faceted purple crystal', color: 'purple', form: 'crystal' },
    { file: 'blue-glass-vortex.webp', desc: 'Smooth blue glass vortex ring', color: 'blue', form: 'vortex' },
    { file: 'magenta-iridescent-bloom.webp', desc: 'Crumpled iridescent magenta flower', color: 'magenta', form: 'bloom' },
    { file: 'violet-iridescent-bloom.webp', desc: 'Crumpled iridescent purple flower', color: 'purple', form: 'bloom' },
    { file: 'pink-petal-bloom.webp', desc: 'Bloom of pink and red petals', color: 'pink', form: 'bloom' },
    { file: 'magenta-glossy-bloom.webp', desc: 'Glossy bright-magenta flower', color: 'magenta', form: 'bloom' },
    { file: 'amber-smoke-blob.webp', desc: 'Orange glass blob with grey smoke', color: 'amber', form: 'blob' },
    { file: 'blue-swirl-vortex.webp', desc: 'Spiraling blue glass vortex', color: 'blue', form: 'vortex' },
    { file: 'green-swirl-vortex.webp', desc: 'Spiraling green and black glass vortex', color: 'green', form: 'vortex' },
    { file: 'dark-green-crystal.webp', desc: 'Faceted deep dark-green crystal', color: 'green', form: 'crystal' },
    { file: 'amethyst-crystal.webp', desc: 'Faceted amethyst-purple crystal', color: 'purple', form: 'crystal' },
    { file: 'pink-iridescent-knot.webp', desc: 'Twisted iridescent pink knot', color: 'pink', form: 'knot' },
    { file: 'lavender-glossy-blob.webp', desc: 'Glossy lavender blob', color: 'purple', form: 'blob' },
    { file: 'blue-glass-knot.webp', desc: 'Deep-blue glass knot', color: 'blue', form: 'knot' },
    { file: 'magenta-crystal.webp', desc: 'Faceted magenta crystal', color: 'magenta', form: 'crystal' },
    { file: 'holographic-pastel-blob.webp', desc: 'Crumpled holographic pastel blob', color: 'pastel', form: 'blob' },
    { file: 'amber-swirl-vortex.webp', desc: 'Spiraling orange and black glass vortex', color: 'amber', form: 'vortex' },
    { file: 'pastel-pink-knot.webp', desc: 'Pastel pink and mint torus knot', color: 'pastel', form: 'knot' },
    { file: 'green-glass-knot.webp', desc: 'Green, black and purple glass knot', color: 'green', form: 'knot' },
    { file: 'magenta-ruby-crystal.webp', desc: 'Faceted ruby-magenta crystal', color: 'magenta', form: 'crystal' },
    { file: 'magenta-smoke-bloom.webp', desc: 'Iridescent magenta smoke flower', color: 'magenta', form: 'bloom' },
    { file: 'violet-green-vortex.webp', desc: 'Spiraling purple and green glass vortex', color: 'purple', form: 'vortex' },
    { file: 'azure-glass-blob.webp', desc: 'Translucent azure glass blob', color: 'blue', form: 'blob' },
    { file: 'lavender-ribbon-knot.webp', desc: 'Knot of glossy lavender ribbons', color: 'purple', form: 'knot' },
    { file: 'iridescent-rose-swirl.webp', desc: 'Spiral of iridescent pink and blue glass', color: 'iridescent', form: 'vortex' },
    { file: 'lavender-petal-bloom.webp', desc: 'Bloom of lavender petals', color: 'purple', form: 'bloom' },
    { file: 'green-glossy-bloom.webp', desc: 'Glossy dark-green flower', color: 'green', form: 'bloom' },
    { file: 'emerald-glass-knot.webp', desc: 'Emerald-green glass knot', color: 'green', form: 'knot' },
    { file: 'ruby-iridescent-knot.webp', desc: 'Twisted iridescent ruby-red knot', color: 'red', form: 'knot' },
]

export const BLOB_ILLUSTRATIONS: readonly BlobIllustration[] = ENTRIES.map(entry => ({
    ...entry,
    url: blobUrl(entry.file),
}))

// Whether the workspace still carries an icon nobody chose. Seeding one from a company favicon must
// never overwrite a mark picked by hand.
export function isBlobUrl(url: string | null | undefined): boolean {
    return !!url && url.includes(`/${BLOB_BUCKET}/`)
}

export function getBlobByFile(file: string): BlobIllustration | undefined {
    return BLOB_ILLUSTRATIONS.find(blob => blob.file === file)
}

export function getBlobsByColor(color: BlobColor): BlobIllustration[] {
    return BLOB_ILLUSTRATIONS.filter(blob => blob.color === color)
}

export function getBlobsByForm(form: BlobForm): BlobIllustration[] {
    return BLOB_ILLUSTRATIONS.filter(blob => blob.form === form)
}

export function randomBlob(): BlobIllustration {
    return BLOB_ILLUSTRATIONS[Math.floor(Math.random() * BLOB_ILLUSTRATIONS.length)]
}
