declare module '*.csv' {
  const value: Array<{ hotkey: string; action: string; description: string }>
  export default value
}
