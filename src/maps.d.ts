declare module '*.csv' {
  const value: Array<{ hotkey: string; action: string; description: string; group: string }>
  export default value
}
