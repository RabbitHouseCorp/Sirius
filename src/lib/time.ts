export const formatTime = (time: number = 0) => {
  if (time < 0)
    return (time * 1000).toFixed(3) + 'us'
  else if (time < 1000)
    return time.toFixed(3) + 'ms'
  else if (time < 60 * 1000)
    return (time / 1000).toFixed(3) + 's'
  else if (time < 60 * 60 * 1000)
    return (time / (60 * 1000)).toFixed(0) + 'min'
  else
    return (time / (60 * 60 * 1000)).toFixed(0) + 'h'
}