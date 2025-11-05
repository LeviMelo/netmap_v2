export default function ColorSwatch({ color }: { color: string }) {
  return <div className="h-4 w-4 rounded border" style={{ background: color }} />
}
