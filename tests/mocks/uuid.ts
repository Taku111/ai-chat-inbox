// CJS mock for uuid v14 (ESM-only package)
let counter = 0
const v4 = () => {
  counter++
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
}

module.exports = { v4 }
module.exports.v4 = v4
