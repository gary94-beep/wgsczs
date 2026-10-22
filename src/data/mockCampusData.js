// Independent campus demo permissions, not a mapping from real grid-system roles.
const permissions = { '13800000009': 9, '13800000000': 1, '13800000001': 1 }
export function getMockCampusData(phone) {
  const role = permissions[phone]
  if (![1, 9].includes(role)) throw new Error('暂无校园生产分析权限，请联系校园生产通管理员')
  const rooms = [
    ['GY', '食科', '1栋', '1', '101', 6, [1, 2, 3], [1]],
    ['GY', '食科', '1栋', '1', '102', 6, [1, 2, 3, 4], [1, 3]],
    ['GY', '食科', '2栋', '2', '201', 4, [1], []],
    ['GY', '机电', '1栋', '1', '101', 4, [1, 2, 3, 4], [1, 2]],
    ['GY', '机电', '3栋', '1', '103', 6, [], []],
    ['ZK', '管理', 'A栋', '1', '101', 4, [1, 2], [2]],
    ['ZK', '管理', 'B栋', '2', '202', 4, [1, 2, 3, 4], [1, 2, 3]]
  ].map(([school, college, building, floor, room, beds, reachedBeds, marketedBeds], index) => ({ id: index + 1, school, college, building, floor, room, beds, reachedBeds, marketedBeds,
    reachedOwners: Object.fromEntries(reachedBeds.map(b => [b, phone])), marketedOwners: Object.fromEntries(marketedBeds.map(b => [b, phone])), remark: '', updatedAt: '' }))
  return { permission: { role }, dorms: rooms, demo: true }
}
