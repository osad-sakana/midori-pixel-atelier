export function NumberField(props: {
  label: string
  value: string | number
  onChange: (value: string) => void
  min?: number
  max?: number
  placeholder?: string
}) {
  const { label, value, onChange, min, max, placeholder } = props
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
