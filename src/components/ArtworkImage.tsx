import { useEffect, useState } from 'react'
import { DEFAULT_ARTWORK } from '../data/artwork'

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }

/** <img> that swaps to the default artwork instead of rendering a broken image. */
export function ArtworkImage({ src, alt = '', onError, ...rest }: Props) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return (
    <img
      {...rest}
      alt={alt}
      src={failed ? DEFAULT_ARTWORK.lightArtwork : src}
      onError={(e) => {
        setFailed(true)
        onError?.(e)
      }}
    />
  )
}
