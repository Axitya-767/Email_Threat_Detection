/**
 * @typedef {Object} MockData
 * @property {string} filename
 * @property {number} file_size_kb
 * @property {string} sha256
 * @property {{name: string, email: string}} sender
 * @property {number} risk_score
 * @property {string} classification
 * @property {{header_routing: number, auth_failure: number, nlp_language: number, reputation: number}} quadrants
 * @property {{spf: string, dkim: string, dmarc: string}} authentication
 * @property {Array<{hop_order: number, ip: string, lat: number, lng: number, place: string, note: string}>} trace
 * @property {{domain_age_days: number, typosquat_target: string, artifacts: string[]}} iocs
 * @property {{nodes: Array<{id: string, type: string, label: string}>, edges: Array<{from: string, to: string, reason: string}>}} relationships
 * @property {Array<{phrase: string, label: string, confidence: number}>} nlp_findings
 * @property {boolean} masked_view_available
 */