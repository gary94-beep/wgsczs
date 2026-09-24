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
  '13800000000': { name: '市公司主管', phone: '13800000000', role: 'city', cityName: '中山市' },
  '13800000001': { name: '城区分公司领导', phone: '13800000001', role: 'branch', branchId: 'B01', branchName: '城区分公司' },
  '13800000002': { name: '火炬分公司主任', phone: '13800000002', role: 'branch', branchId: 'B02', branchName: '火炬分公司' },
  '13800000003': { name: '城区网格长', phone: '13800000003', role: 'grid', branchId: 'B01', branchName: '城区分公司', gridId: 'G001', gridName: '城区一网格' }
}

export const mockProducts = [
  { productId: 'revenue', productName: '收入', unit: '万元' },
  { productId: 'newNumbers', productName: '放号', unit: '户' },
  { productId: 'plan119', productName: '119+套餐', unit: '户' },
  { productId: 'terminal', productName: '终端合约', unit: '单' },
  { productId: 'homeBroadband', productName: '手宽新增', unit: '户' },
  { productId: 'gigabit', productName: '千兆运营', unit: '户' }
]

const targetMatrix = {
  G001: [62, 32, 25, 18, 26, 16],
  G003: [45, 25, 18, 14, 20, 12],
  G002: [42, 26, 20, 14, 21, 13]
}

export const mockTargets = mockGrids.flatMap(grid =>
  mockProducts.map((product, index) => ({
    gridId: grid.gridId,
    productId: product.productId,
    target: targetMatrix[grid.gridId][index]
  }))
)

const staff = [
  ['G001', 'S001', '梁敏', '直销一队', '社区摆摊', [15, 8, 6, 4, 7, 3]],
  ['G001', 'S002', '黄志远', '直销一队', '电话触达', [3, 1, 1, 0, 1, 0]],
  ['G001', 'S003', '麦嘉欣', '社区经理', '微信群', [0, 0, 0, 0, 0, 0]],
  ['G001', 'S004', '林浩', '社区经理', '异业门店', [8, 5, 4, 3, 3, 2]],
  ['G001', 'S005', '郑晓婷', '直销二队', '社区摆摊', [4, 2, 1, 0, 2, 1]],
  ['G001', 'S006', '何俊杰', '直销二队', '存量外呼', [19, 9, 7, 6, 8, 5]],
  ['G001', 'S007', '邓丽', '社区经理', '物业推荐', [0, 0, 0, 0, 0, 0]],
  ['G001', 'S008', '冯嘉豪', '直销一队', '电话触达', [7, 4, 3, 2, 4, 2]],
  ['G002', 'S101', '张芷晴', '火炬直销', '园区驻点', [15, 8, 5, 4, 7, 3]],
  ['G002', 'S102', '罗伟', '火炬直销', '企业微信', [2, 1, 0, 0, 1, 0]],
  ['G002', 'S103', '谢明', '商圈经理', '商户推荐', [12, 7, 5, 3, 5, 3]],
  ['G002', 'S104', '赵晓', '商圈经理', '电话触达', [5, 2, 1, 1, 2, 1]],
  ['G003', 'S201', '刘文', '西区一队', '社区摆摊', [17, 9, 6, 4, 6, 3]],
  ['G003', 'S202', '许琳', '西区一队', '存量外呼', [4, 1, 1, 0, 1, 0]],
  ['G003', 'S203', '吴越', '西区二队', '物业推荐', [0, 0, 0, 0, 0, 0]],
  ['G003', 'S204', '宋佳', '西区二队', '微信群', [14, 8, 5, 3, 5, 2]]
]

export const mockCapacityRows = staff.flatMap(([gridId, staffId, staffName, team, channel, values]) => {
  const grid = mockGrids.find(item => item.gridId === gridId)
  return mockProducts.map((product, index) => ({
    branchId: grid.branchId,
    gridId,
    staffId,
    staffName,
    team,
    channel,
    productId: product.productId,
    production: values[index]
  }))
})
