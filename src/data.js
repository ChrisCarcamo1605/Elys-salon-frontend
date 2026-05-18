// Mock data for Ely's Salón POS
const data = (function () {
  const users = [
    {
      id: "u_ely",
      name: "Ely Martínez",
      role: "admin",
      pin: "1234",
      initials: "EM",
      color: "#de0fab",
    },
    {
      id: "u_maria",
      name: "María López",
      role: "empleada",
      pin: "0000",
      initials: "ML",
      color: "#0fb0de",
      // Achievement tracking for the multi-goal Progreso view
      monthStats: {
        totalSales: 78.5,
        retailSales: 32,
        servicesDone: 28,
        newClients: 3,
        tipsCollected: 24,
      },
    },
    {
      id: "u_carla",
      name: "Carla Rivas",
      role: "empleada",
      pin: "2222",
      initials: "CR",
      color: "#7b2cbf",
      monthStats: {
        totalSales: 142,
        retailSales: 58,
        servicesDone: 35,
        newClients: 6,
        tipsCollected: 38,
      },
    },
  ];

  // Full HR roster (extends `users` with employment info)
  const employees = [
    {
      id: "u_ely",
      name: "Ely Martínez",
      position: "Dueña / Estilista senior",
      role: "admin",
      status: "activa",
      hireDate: "2019-03-12",
      phone: "+52 871 555 0101",
      email: "ely@elyssalon.mx",
      birthday: "1988-07-04",
      schedule: "L–S 10:00–20:00",
      payType: "salario",
      salary: 18000,
      commissionRate: 12,
      avatarHue: 326,
    },
    {
      id: "u_maria",
      name: "María López",
      position: "Estilista",
      role: "empleada",
      status: "activa",
      hireDate: "2022-08-01",
      phone: "+52 871 555 0202",
      email: "maria@elyssalon.mx",
      birthday: "1996-02-18",
      schedule: "L–V 11:00–19:00",
      payType: "salario + comisión",
      salary: 6500,
      commissionRate: 8,
      avatarHue: 198,
    },
    {
      id: "u_carla",
      name: "Carla Rivas",
      position: "Manicurista",
      role: "empleada",
      status: "activa",
      hireDate: "2023-05-20",
      phone: "+52 871 555 0303",
      email: "carla@elyssalon.mx",
      birthday: "1999-11-30",
      schedule: "M–S 12:00–20:00",
      payType: "comisión",
      salary: 0,
      commissionRate: 15,
      avatarHue: 270,
    },
    {
      id: "u_sofia",
      name: "Sofía Peña",
      position: "Recepcionista",
      role: "empleada",
      status: "vacaciones",
      hireDate: "2024-01-15",
      phone: "+52 871 555 0404",
      email: "sofia@elyssalon.mx",
      birthday: "2000-09-22",
      schedule: "L–V 09:00–17:00",
      payType: "salario",
      salary: 5800,
      commissionRate: 0,
      avatarHue: 142,
    },
    {
      id: "u_dani",
      name: "Daniela Gómez",
      position: "Estilista jr.",
      role: "empleada",
      status: "activa",
      hireDate: "2024-09-05",
      phone: "+52 871 555 0505",
      email: "dani@elyssalon.mx",
      birthday: "2001-04-11",
      schedule: "Mi–D 13:00–21:00",
      payType: "comisión",
      salary: 0,
      commissionRate: 10,
      avatarHue: 38,
    },
  ];

  // Today's time clock entries (and yesterday for history)
  const today = new Date();
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const todayStr = isoDay(today);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const yestStr = isoDay(yest);

  const timeEntries = [
    // Today
    { id: "te1", userId: "u_ely",   date: todayStr, in: "09:48", out: null },
    { id: "te2", userId: "u_maria", date: todayStr, in: "10:55", out: null },
    { id: "te3", userId: "u_carla", date: todayStr, in: "12:02", out: "14:30" },
    { id: "te4", userId: "u_carla", date: todayStr, in: "15:10", out: null },
    // Yesterday
    { id: "te5", userId: "u_ely",   date: yestStr,  in: "09:55", out: "20:12" },
    { id: "te6", userId: "u_maria", date: yestStr,  in: "11:02", out: "19:08" },
    { id: "te7", userId: "u_carla", date: yestStr,  in: "12:05", out: "20:01" },
    { id: "te8", userId: "u_dani",  date: yestStr,  in: "13:10", out: "21:02" },
  ];

  // Historic time entries — 60 days back, generated synthetically.
  // Used by the "Horas trabajadas" reports in Plantilla.
  const historicTimeEntries = (() => {
    const out = [];
    const seedSchedules = {
      u_ely:   { inH: 10, outH: 20, varianceMins: 18, daysOff: [0] },     // L–S
      u_maria: { inH: 11, outH: 19, varianceMins: 14, daysOff: [0, 6] }, // L–V
      u_carla: { inH: 12, outH: 20, varianceMins: 16, daysOff: [1] },    // M–D
      u_sofia: { inH: 9,  outH: 17, varianceMins: 8,  daysOff: [0, 6] }, // En vacaciones — skip recent
      u_dani:  { inH: 13, outH: 21, varianceMins: 22, daysOff: [0, 1] }, // Mi–D
    };
    const pad = (n) => String(n).padStart(2, "0");
    for (let i = 60; i >= 2; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = isoDay(d);
      const dow = d.getDay();
      for (const [userId, sch] of Object.entries(seedSchedules)) {
        // Sofía on vacation last 5 days
        if (userId === "u_sofia" && i < 7) continue;
        if (sch.daysOff.includes(dow)) continue;
        // Skip ~7% randomly to simulate sick days / no-shows
        if ((i * 7 + userId.length) % 14 === 0) continue;
        const inOffset = ((i * 13 + userId.length * 3) % (sch.varianceMins * 2)) - sch.varianceMins;
        const outOffset = ((i * 17 + userId.length * 5) % (sch.varianceMins * 2)) - sch.varianceMins;
        const inMin  = sch.inH * 60 + Math.max(-30, Math.min(45, inOffset));
        const outMin = sch.outH * 60 + outOffset;
        out.push({
          id: `te_h_${userId}_${dayStr}`,
          userId,
          date: dayStr,
          in:  `${pad(Math.floor(inMin / 60))}:${pad(inMin % 60)}`,
          out: `${pad(Math.floor(outMin / 60))}:${pad(outMin % 60)}`,
        });
      }
    }
    return out;
  })();

  // Multiple bonus goals — each one independent and stackable
  const goals = [
    {
      id: "g_total",
      icon: "Trophy",
      label: "Bono mensual",
      desc: "Supera $100 en ventas del mes y gana un bono fijo.",
      metric: "totalSales",
      unit: "$",
      target: 100,
      reward: "$10 fijo",
      rewardType: "fixed",
      rewardValue: 10,
      tone: "magenta",
    },
    {
      id: "g_retail",
      icon: "Box",
      label: "Comisión retail",
      desc: "Vende más de $50 en productos y llévate 5% sobre productos.",
      metric: "retailSales",
      unit: "$",
      target: 50,
      reward: "5% del retail",
      rewardType: "percent",
      rewardValue: 5,
      tone: "purple",
    },
    {
      id: "g_services",
      icon: "Sparkle",
      label: "Servicios completados",
      desc: "Completa 40 servicios en el mes para un bono extra.",
      metric: "servicesDone",
      unit: "",
      target: 40,
      reward: "$15 extra",
      rewardType: "fixed",
      rewardValue: 15,
      tone: "teal",
    },
    {
      id: "g_new",
      icon: "Users",
      label: "Clientas nuevas",
      desc: "Atrae 5 clientas nuevas y suma $5 a tu pago.",
      metric: "newClients",
      unit: "",
      target: 5,
      reward: "$5 extra",
      rewardType: "fixed",
      rewardValue: 5,
      tone: "green",
    },
  ];

  const categories = [
    { id: "tintes", label: "Tintes" },
    { id: "cabello", label: "Cabello" },
    { id: "alisados", label: "Alisados" },
    { id: "manicure", label: "Manicure" },
    { id: "pedicure", label: "Pedicure" },
    { id: "nails", label: "Nails" },
    { id: "productos", label: "Productos" },
  ];

  // Unsplash photo IDs that match the salon context (free use under Unsplash license)
  const U = (id, w = 400) =>
    `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&fit=crop&auto=format&q=80`;

  // type: "S" servicio  |  "P" producto
  const catalog = [
    // Tintes
    { id: "t1", cat: "tintes", type: "S", name: "Tinte raíz", price: 35, duration: "45m", cost: 8, image: U("1522337094846-8a818192de1f") },
    { id: "t2", cat: "tintes", type: "S", name: "Tinte completo", price: 55, duration: "1h 15m", cost: 14, image: U("1605497788044-5a32c7078486") },
    { id: "t3", cat: "tintes", type: "S", name: "Mechas / babylights", price: 80, duration: "2h", cost: 22, image: U("1560066984-138dadb4c035") },
    { id: "t4", cat: "tintes", type: "S", name: "Balayage", price: 110, duration: "2h 30m", cost: 28, image: U("1562322140-8baeececf3df") },
    { id: "t5", cat: "tintes", type: "S", name: "Decoloración", price: 70, duration: "1h 30m", cost: 18, image: U("1595476108010-b4d1f102b1b1") },
    { id: "t6", cat: "tintes", type: "S", name: "Matizado", price: 25, duration: "30m", cost: 6, image: U("1605497788044-5a32c7078486") },

    // Cabello
    { id: "c1", cat: "cabello", type: "S", name: "Corte mujer", price: 18, duration: "30m", cost: 3, image: U("1521590832167-7bcbfaa6381f") },
    { id: "c2", cat: "cabello", type: "S", name: "Corte hombre", price: 12, duration: "20m", cost: 2, image: U("1599351431202-1e0f0137899a") },
    { id: "c3", cat: "cabello", type: "S", name: "Corte niño/niña", price: 10, duration: "20m", cost: 2, image: U("1622286342621-4bd786c2447c") },
    { id: "c4", cat: "cabello", type: "S", name: "Peinado evento", price: 30, duration: "45m", cost: 5, image: U("1492106087820-71f1a00d2b11") },
    { id: "c5", cat: "cabello", type: "S", name: "Lavado + secado", price: 12, duration: "25m", cost: 2, image: U("1559599101-f09722fb4948") },
    { id: "c6", cat: "cabello", type: "S", name: "Tratamiento capilar", price: 22, duration: "30m", cost: 5, image: U("1633681926022-84c23e8cb2d6") },

    // Alisados
    { id: "a1", cat: "alisados", type: "S", name: "Alisado brasileño", price: 95, duration: "2h", cost: 26, image: U("1522337360788-8b13dee7a37e") },
    { id: "a2", cat: "alisados", type: "S", name: "Alisado japonés", price: 130, duration: "3h", cost: 38, image: U("1605980776566-0486c3ac7617") },
    { id: "a3", cat: "alisados", type: "S", name: "Botox capilar", price: 65, duration: "1h 30m", cost: 18, image: U("1519415510236-718bdfcd89c8") },
    { id: "a4", cat: "alisados", type: "S", name: "Keratina", price: 75, duration: "2h", cost: 20, image: U("1604336732494-37df6e96f3d8") },

    // Manicure
    { id: "m1", cat: "manicure", type: "S", name: "Manicure básico", price: 12, duration: "30m", cost: 2, image: U("1604654894610-df63bc536371") },
    { id: "m2", cat: "manicure", type: "S", name: "Manicure spa", price: 20, duration: "45m", cost: 4, image: U("1610992015732-2449b76344bc") },
    { id: "m3", cat: "manicure", type: "S", name: "Esmaltado gel", price: 18, duration: "40m", cost: 3, image: U("1599948128020-9a44505b58b3") },
    { id: "m4", cat: "manicure", type: "S", name: "Retiro de gel", price: 8, duration: "15m", cost: 1, image: U("1632345031435-8727f6897d53") },

    // Pedicure
    { id: "p1", cat: "pedicure", type: "S", name: "Pedicure básico", price: 15, duration: "40m", cost: 3, image: U("1519415510236-718bdfcd89c8") },
    { id: "p2", cat: "pedicure", type: "S", name: "Pedicure spa", price: 25, duration: "1h", cost: 5, image: U("1583416750470-965b2707b355") },
    { id: "p3", cat: "pedicure", type: "S", name: "Pedicure + gel", price: 30, duration: "1h", cost: 6, image: U("1519415510236-718bdfcd89c8") },

    // Nails
    { id: "n1", cat: "nails", type: "S", name: "Uñas acrílicas", price: 35, duration: "1h 15m", cost: 8, image: U("1599948128020-9a44505b58b3") },
    { id: "n2", cat: "nails", type: "S", name: "Polygel", price: 40, duration: "1h 30m", cost: 10, image: U("1632344004129-a51b1a96e4a4") },
    { id: "n3", cat: "nails", type: "S", name: "Soft gel", price: 38, duration: "1h 15m", cost: 9, image: U("1604654894610-df63bc536371") },
    { id: "n4", cat: "nails", type: "S", name: "Nail art (por uña)", price: 3, duration: "5m", cost: 0.5, image: U("1610992015732-2449b76344bc") },
    { id: "n5", cat: "nails", type: "S", name: "Reparación", price: 5, duration: "10m", cost: 1, image: U("1604654894610-df63bc536371") },
    { id: "n6", cat: "nails", type: "S", name: "Retiro acrílico", price: 10, duration: "20m", cost: 1, image: U("1632345031435-8727f6897d53") },

    // Productos retail
    { id: "r1", cat: "productos", type: "P", name: "Shampoo profesional 500ml", price: 18, cost: 8, stock: 14, stockMin: 8, alertEnabled: true,  sku: "SH-500-PRO", brand: "L'Oréal Pro", image: U("1556228720-da4e85b6bbdf") },
    { id: "r2", cat: "productos", type: "P", name: "Acondicionador 500ml", price: 18, cost: 8, stock: 11, stockMin: 8, alertEnabled: true,  sku: "AC-500-PRO", brand: "L'Oréal Pro", image: U("1556228852-80b6e5eeff06") },
    { id: "r3", cat: "productos", type: "P", name: "Mascarilla hidratante", price: 22, cost: 10, stock: 7, stockMin: 6, alertEnabled: true,  sku: "MS-HYD-01", brand: "Kérastase", image: U("1571781926291-c477ebfd024b") },
    { id: "r4", cat: "productos", type: "P", name: "Aceite de argán 100ml", price: 15, cost: 6, stock: 9, stockMin: 6, alertEnabled: true,  sku: "AR-100-OIL", brand: "Moroccanoil", image: U("1611080626919-7cf5a9dbab12") },
    { id: "r5", cat: "productos", type: "P", name: "Spray protector térmico", price: 12, cost: 5, stock: 5, stockMin: 6, alertEnabled: true,  sku: "SP-TER-01", brand: "Tresemmé", image: U("1583251633146-d0c6c036187d") },
    { id: "r6", cat: "productos", type: "P", name: "Esmalte gel (color)", price: 10, cost: 3, stock: 24, stockMin: 10, alertEnabled: false, sku: "ES-GEL-CLR", brand: "OPI", image: U("1632345031435-8727f6897d53") },
    { id: "r7", cat: "productos", type: "P", name: "Lima profesional", price: 4, cost: 1, stock: 30, stockMin: 10, alertEnabled: false, sku: "LI-PRO-01", brand: "Mertz", image: U("1599948128020-9a44505b58b3") },
    { id: "r8", cat: "productos", type: "P", name: "Crema de manos", price: 8, cost: 3, stock: 18, stockMin: 8, alertEnabled: false, sku: "CR-MAN-01", brand: "L'Occitane", image: U("1571875257727-256c39da42af") },
  ];

  // Default global stock-min if a product has no override
  const stockAlertConfig = {
    defaultMinStock: 8,
    enabledByDefault: false,
  };

  // 30 days of synthetic sales for analytics
  const salesByDay = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const base = 280 + Math.sin(i / 3) * 90 + (i % 7 === 0 ? 180 : 0);
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.6)) * 60;
    const ventas = Math.max(120, Math.round(base + noise));
    const costos = Math.round(ventas * (0.38 + Math.sin(i) * 0.04));
    salesByDay.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      ventas,
      costos,
      utilidad: ventas - costos,
      tickets: Math.round(6 + Math.abs(Math.sin(i * 1.3)) * 8),
    });
  }

  const categoryRevenue = [
    { name: "Tintes", value: 2840, color: "#de0fab" },
    { name: "Cabello", value: 1620, color: "#0fb0de" },
    { name: "Alisados", value: 1980, color: "#7b2cbf" },
    { name: "Nails", value: 2110, color: "#f59e0b" },
    { name: "Mani/Pedi", value: 1240, color: "#10b981" },
    { name: "Productos", value: 870, color: "#64748b" },
  ];

  const topEmployees = [
    { name: "María L.", ventas: 1820, servicios: 42 },
    { name: "Ely M.", ventas: 2640, servicios: 38 },
    { name: "Carla R.", ventas: 1410, servicios: 31 },
    { name: "Sofía P.", ventas: 980, servicios: 24 },
    { name: "Dani G.", ventas: 720, servicios: 18 },
  ];

  const hourlyTraffic = [
    { hour: "9", clientes: 2 },
    { hour: "10", clientes: 4 },
    { hour: "11", clientes: 7 },
    { hour: "12", clientes: 9 },
    { hour: "13", clientes: 5 },
    { hour: "14", clientes: 6 },
    { hour: "15", clientes: 10 },
    { hour: "16", clientes: 12 },
    { hour: "17", clientes: 14 },
    { hour: "18", clientes: 11 },
    { hour: "19", clientes: 8 },
    { hour: "20", clientes: 4 },
  ];

  // Settings master-detail data
  const settingsSections = [
    {
      id: "business",
      group: "Negocio",
      label: "Datos del negocio",
      desc: "Nombre, RFC y dirección",
      icon: "Sparkle",
      kind: "form",
      fields: [
        { key: "name", label: "Nombre comercial", value: "Ely's Salón de Belleza", type: "text" },
        { key: "rfc", label: "RFC / Tax ID", value: "EMP980314XYZ", type: "text" },
        { key: "phone", label: "Teléfono", value: "+52 871 555 0123", type: "text" },
        { key: "email", label: "Correo", value: "contacto@elyssalon.mx", type: "text" },
        { key: "address", label: "Dirección", value: "Av. Hidalgo 124, Torreón, Coahuila", type: "text" },
      ],
    },
    {
      id: "hours",
      group: "Negocio",
      label: "Horarios y días",
      desc: "Días de operación y horas pico",
      icon: "Clock",
      kind: "hours",
      schedule: [
        { day: "Lunes", open: "10:00", close: "20:00", on: true },
        { day: "Martes", open: "10:00", close: "20:00", on: true },
        { day: "Miércoles", open: "10:00", close: "20:00", on: true },
        { day: "Jueves", open: "10:00", close: "20:00", on: true },
        { day: "Viernes", open: "10:00", close: "21:00", on: true },
        { day: "Sábado", open: "09:00", close: "21:00", on: true },
        { day: "Domingo", open: "11:00", close: "17:00", on: false },
      ],
    },
    {
      id: "receipt",
      group: "Negocio",
      label: "Ticket / recibo",
      desc: "Personaliza el comprobante impreso",
      icon: "Receipt",
      kind: "receipt",
    },
    {
      id: "tax",
      group: "Negocio",
      label: "Impuestos",
      desc: "IVA y tasas aplicables",
      icon: "Tag",
      kind: "tax",
      rate: 16,
      includedInPrice: true,
    },

    {
      id: "services",
      group: "Catálogo",
      label: "Servicios",
      desc: "Edita servicios del salón",
      icon: "Sparkle",
      kind: "catalog-list",
      filter: "S",
    },
    {
      id: "products",
      group: "Catálogo",
      label: "Productos retail",
      desc: "Productos para reventa",
      icon: "Box",
      kind: "catalog-list",
      filter: "P",
    },
    {
      id: "categories",
      group: "Catálogo",
      label: "Categorías",
      desc: "Agrupa servicios y productos",
      icon: "Tag",
      kind: "categories",
    },
    {
      id: "promos",
      group: "Catálogo",
      label: "Promociones",
      desc: "Descuentos guardados",
      icon: "Tag",
      kind: "promos",
      promos: [
        { name: "2x1 Manicure (lunes)", desc: "Manicure básico, lunes", off: "50%", on: true },
        { name: "Tinte + corte combo", desc: "$10 off al combinar", off: "-$10", on: true },
        { name: "Clienta nueva", desc: "15% primer servicio", off: "15%", on: false },
      ],
    },

    {
      id: "users",
      group: "Equipo",
      label: "Usuarios y PINs",
      desc: "Acceso a la terminal",
      icon: "Users",
      kind: "users",
    },
    {
      id: "roles",
      group: "Equipo",
      label: "Roles y permisos",
      desc: "Quién puede hacer qué",
      icon: "Lock",
      kind: "roles",
      permissions: [
        { perm: "Registrar ventas", admin: true, empleada: true },
        { perm: "Modificar precios y descuentos", admin: true, empleada: false },
        { perm: "Cancelar ventas", admin: true, empleada: false },
        { perm: "Ver ventas e ingresos", admin: true, empleada: false },
        { perm: "Ajustar inventario", admin: true, empleada: true },
        { perm: "Eliminar productos", admin: true, empleada: false },
        { perm: "Acceder a analíticas", admin: true, empleada: false },
        { perm: "Configurar negocio", admin: true, empleada: false },
      ],
    },
    {
      id: "goals",
      group: "Equipo",
      label: "Metas y bonos",
      desc: "Configura objetivos del mes",
      icon: "Trophy",
      kind: "goals",
    },
    {
      id: "commissions",
      group: "Equipo",
      label: "Comisiones",
      desc: "Porcentaje por servicio/producto",
      icon: "Cash",
      kind: "commissions",
      rows: [
        { name: "Servicios", rate: 8 },
        { name: "Productos retail", rate: 5 },
        { name: "Tintes y químicos", rate: 10 },
      ],
    },

    {
      id: "lock",
      group: "Terminal",
      label: "Tiempo de bloqueo",
      desc: "Auto-bloqueo por inactividad",
      icon: "Lock",
      kind: "lock-time",
    },
    {
      id: "payments",
      group: "Terminal",
      label: "Métodos de pago",
      desc: "Habilita formas de cobro",
      icon: "Card",
      kind: "payments",
      methods: [
        { id: "cash", label: "Efectivo", on: true },
        { id: "card", label: "Tarjeta de crédito/débito", on: true },
        { id: "transfer", label: "Transferencia bancaria", on: true },
        { id: "mixed", label: "Pago mixto", on: true },
        { id: "deposit", label: "Anticipo / apartado", on: false },
      ],
    },
    {
      id: "appearance",
      group: "Terminal",
      label: "Apariencia",
      desc: "Tema, color y densidad",
      icon: "Sparkle",
      kind: "appearance",
    },
    {
      id: "backup",
      group: "Terminal",
      label: "Copias de seguridad",
      desc: "Respaldo automático en la nube",
      icon: "Box",
      kind: "backup",
    },
  ];

  return {
    users,
    employees,
    timeEntries,
    historicTimeEntries,
    stockAlertConfig,
    categories,
    catalog,
    salesByDay,
    categoryRevenue,
    topEmployees,
    hourlyTraffic,
    goals,
    settingsSections,
  };
})();

export default data;
