import * as Slider from '@radix-ui/react-slider'

export function SliderField(props: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  unit?: string
}) {
  const { label, value, min, max, onChange, unit = '' } = props
  return (
    <div className="slider-field">
      <span className="slider-label">{label}</span>
      <Slider.Root
        className="slider-root"
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? value)}
        aria-label={label}
      >
        <Slider.Track className="slider-track">
          <Slider.Range className="slider-range" />
        </Slider.Track>
        <Slider.Thumb className="slider-thumb" aria-label={label} />
      </Slider.Root>
      <output className="slider-value">
        {value}
        {unit}
      </output>
    </div>
  )
}
