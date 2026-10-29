export const mockBranches = [
  { branchId: 'B01', branchName: '城区分公司' },
  { branchId: 'B02', branchName: '火炬分公司' }
]

export const mockGrids = [
  { gridId: 'G001', gridName: '城区一网格', branchId: 'B01' },
  { gridId: 'G003', gridName: '西区综合网格', branchId: 'B01' },
  { gridId: 'G002', gridName: '火炬二网格', branchId: 'B02' }
]

export const mockPermissions = {
  '13800000009': { name: '超级管理员', phone: '13800000009', role: 'city', cityName: '中山市', isSuperAdmin: true },
  '13800000000': { name: '市公司主管', phone: '13800000000', role: 'city', cityName: '中山市' },
  '13800000001': { name: '城区分公司领导', phone: '13800000001', role: 'branch', branchId: 'B01', branchName: '城区分公司' },
  '13800000002': { name: '火炬分公司主任', phone: '13800000002', role: 'branch', branchId: 'B02', branchName: '火炬分公司' },
  '13800000003': { name: '城区网格长', phone: '13800000003', role: 'grid', branchId: 'B01', branchName: '城区分公司', gridId: 'G001', gridName: '城区一网格' }
}

export const mockProducts = [
  { productId: 'newNumbers', productName: '放号', unit: '户' },
  { productId: 'plan119', productName: '119+套餐', unit: '户' },
  { productId: 'terminal', productName: '终端合约', unit: '单' },
  { productId: 'homeBroadband', productName: '手宽新增', unit: '户' },
  { productId: 'gigabit', productName: '千兆运营', unit: '户' }
]

const targetMatrix = {
  G001: [32, 25, 18, 26, 16],
  G003: [25, 18, 14, 20, 12],
  G002: [26, 20, 14, 21, 13]
}

export const mockTargets = mockGrids.flatMap(grid =>
  mockProducts.map((product, index) => ({
    gridId: grid.gridId,
    productId: product.productId,
    target: targetMatrix[grid.gridId][index],
    monthBaseTarget: targetMatrix[grid.gridId][index],
    monthChallengeTarget: Math.ceil(targetMatrix[grid.gridId][index] * 1.25)
  }))
)

const staff = [
  ['G001', 'S001', '梁敏', '直销一队', '社区摆摊', [8, 6, 4, 7, 3]],
  ['G001', 'S002', '黄志远', '直销一队', '电话触达', [1, 1, 0, 1, 0]],
  ['G001', 'S003', '麦嘉欣', '社区经理', '微信群', [0, 0, 0, 0, 0]],
  ['G001', 'S004', '林浩', '社区经理', '异业门店', [5, 4, 3, 3, 2]],
  ['G001', 'S005', '郑晓婷', '直销二队', '社区摆摊', [2, 1, 0, 2, 1]],
  ['G001', 'S006', '何俊杰', '直销二队', '存量外呼', [9, 7, 6, 8, 5]],
  ['G001', 'S007', '邓丽', '社区经理', '物业推荐', [0, 0, 0, 0, 0]],
  ['G001', 'S008', '冯嘉豪', '直销一队', '电话触达', [4, 3, 2, 4, 2]],
  ['G002', 'S101', '张芷晴', '火炬直销', '园区驻点', [8, 5, 4, 7, 3]],
  ['G002', 'S102', '罗伟', '火炬直销', '企业微信', [1, 0, 0, 1, 0]],
  ['G002', 'S103', '谢明', '商圈经理', '商户推荐', [7, 5, 3, 5, 3]],
  ['G002', 'S104', '赵晓', '商圈经理', '电话触达', [2, 1, 1, 2, 1]],
  ['G003', 'S201', '刘文', '西区一队', '社区摆摊', [9, 6, 4, 6, 3]],
  ['G003', 'S202', '许琳', '西区一队', '存量外呼', [1, 1, 0, 1, 0]],
  ['G003', 'S203', '吴越', '西区二队', '物业推荐', [0, 0, 0, 0, 0]],
  ['G003', 'S204', '宋佳', '西区二队', '微信群', [8, 5, 3, 5, 2]]
]

// Explicit demo assignments; real data supplies the classification from the source system.
const staffChannelTypes = {
  S001: '直销队伍', S002: '直销队伍', S003: '末梢', S004: '3星+渠道',
  S005: '直销队伍', S006: '直销队伍', S007: '末梢', S008: '直销队伍',
  S101: '直销队伍', S102: '直销队伍', S103: '3星+渠道', S104: '末梢',
  S201: '直销队伍', S202: '直销队伍', S203: '3星+渠道', S204: '末梢'
}

export const mockCapacityRows = staff.flatMap(([gridId, staffId, staffName, team, channel, values]) => {
  const grid = mockGrids.find(item => item.gridId === gridId)
  const staffRole = ['装维随销', '行销经理', '商企经理'][Number(staffId.slice(1)) % 3]
  return mockProducts.map((product, index) => ({
    branchId: grid.branchId,
    gridId,
    staffId,
    staffName,
    staffRole,
    team,
    channel,
    channelCode: `${gridId}-${staffId}`,
    channelStar: 3 + Number(staffId.slice(1)) % 3,
    microChannelName: `${grid.gridName}${channel}服务点`,
    serviceProvider: `${mockBranches.find(item => item.branchId === grid.branchId).branchName}区域服务商`,
    channelType: staffChannelTypes[staffId],
    productId: product.productId,
    production: values[index]
  }))
})
