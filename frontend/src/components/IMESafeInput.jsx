import { forwardRef, useState } from 'react'

const IMESafeInput = forwardRef(({ onChange, ...props }, ref) => {
  const [isComposing, setIsComposing] = useState(false)

  const handleChange = (event) => {
    if (isComposing) return
    onChange?.(event)
  }

  return (
    <input
      ref={ref}
      {...props}
      onChange={handleChange}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={(event) => {
        setIsComposing(false)
        onChange?.(event)
      }}
    />
  )
})

export default IMESafeInput
