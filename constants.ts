


import { PipeSegment, StageStatus } from './types';

// Helper to create default stages
export const createDefaultStages = () => ({
  scaffolding: { id: 'scaf', label: 'Andaime / Acesso', status: StageStatus.NOT_STARTED, icon: 'Scaffold', requiredResources: ['Andaime Tubular', 'Montador x2'] },
  lifting: { id: 'lift', label: 'Içamento / Posicionamento', status: StageStatus.NOT_STARTED, icon: 'Crane', requiredResources: ['Caminhão Munk', 'Rigger'] },
  welding: { id: 'weld', label: 'Soldagem (Geral)', status: StageStatus.NOT_STARTED, icon: 'Flame', requiredResources: ['Soldador TIG/ER', 'Eletrodos 7018'] },
  inspection: { id: 'insp', label: 'Inspeção de Qualidade', status: StageStatus.NOT_STARTED, icon: 'ShieldCheck', requiredResources: ['Inspetor N1', 'Liquido Penetrante'] },
  hydrotest: { id: 'hydro', label: 'Teste Hidrostático', status: StageStatus.NOT_STARTED, icon: 'Droplet', requiredResources: ['Bomba Teste', 'Manômetro Calibrado'] },
  insulation: { id: 'insul', label: 'Proteção Térmica', status: StageStatus.NOT_STARTED, icon: 'Package', requiredResources: ['Lã de Rocha', 'Funileiro'] },
});

// Helper to randomize status based on logical progression
const generateRandomStages = () => {
    const stages = createDefaultStages();
    return stages;
};

// --- SUPPORT GENERATOR LOGIC ---
export const generateRackPath = (x: number, y: number, width: number, height: number) => {
    const halfW = width / 2;
    const beamThick = 6;
    
    // Top Beam (Centered on X, Top at Y)
    const beam = `M ${x - halfW} ${y} L ${x + halfW} ${y} L ${x + halfW} ${y + beamThick} L ${x - halfW} ${y + beamThick} Z`;
    
    // Legs
    const legLeft = `M ${x - halfW + 4} ${y + beamThick} L ${x - halfW + 4} ${y + height} L ${x - halfW + 10} ${y + height} L ${x - halfW + 10} ${y + beamThick}`;
    const legRight = `M ${x + halfW - 10} ${y + beamThick} L ${x + halfW - 10} ${y + height} L ${x + halfW - 4} ${y + height} L ${x + halfW - 4} ${y + beamThick}`;

    // Concrete Bases (Feet)
    const baseLeft = `M ${x - halfW - 2} ${y + height} L ${x - halfW + 16} ${y + height} L ${x - halfW + 16} ${y + height + 10} L ${x - halfW - 2} ${y + height + 10} Z`;
    const baseRight = `M ${x + halfW - 16} ${y + height} L ${x + halfW + 2} ${y + height} L ${x + halfW + 2} ${y + height + 10} L ${x + halfW - 16} ${y + height + 10} Z`;
    
    // Cross bracing
    let bracing = '';
    if (height > 40) {
        bracing = `M ${x - halfW + 10} ${y + beamThick + 5} L ${x + halfW - 10} ${y + height - 5} M ${x - halfW + 10} ${y + height - 5} L ${x + halfW - 10} ${y + beamThick + 5}`;
    }

    return `${beam} ${legLeft} ${legRight} ${baseLeft} ${baseRight} ${bracing}`;
};

export const generateCantileverPath = (x: number, y: number, width: number, height: number) => {
    const thickness = 6;
    const armLength = width;
    const legHeight = height;
    
    // Logic: x,y is the Reference Point (e.g. where the pipe would be).
    // The support is offset by 'halfArm' to the left.
    // width controls the offset distance.
    
    const halfArm = armLength / 2;
    const legX = x - halfArm; // Left edge of the post
    
    // 1. Vertical Post (Leg) - Starts at y, goes down
    const post = `M ${legX} ${y} L ${legX + thickness} ${y} L ${legX + thickness} ${y + legHeight} L ${legX} ${y + legHeight} Z`;
    
    // 2. Base Plate
    const base = `M ${legX - 4} ${y + legHeight} L ${legX + thickness + 4} ${y + legHeight} L ${legX + thickness + 4} ${y + legHeight + 6} L ${legX - 4} ${y + legHeight + 6} Z`;

    // Removed the horizontal arm as requested.
    return `${post} ${base}`;
};

export const generateFloatingSupportPath = (x: number, y: number, width: number, height: number) => {
    // A simple block support that starts at x,y (Top Center) and goes down.
    // This ensures it behaves like other supports where 'y' is the top contact surface.
    const halfW = width / 2;
    // M TopLeft -> TopRight -> BottomRight -> BottomLeft -> Z
    // Top is at y. Bottom is at y + height.
    return `M ${x - halfW} ${y} L ${x + halfW} ${y} L ${x + halfW} ${y + height} L ${x - halfW} ${y + height} Z`;
};

// --- SHAPE GENERATOR LOGIC ---
export const generateRectanglePath = (x: number, y: number, width: number, height: number) => {
    // Centered rectangle
    const halfW = width / 2;
    const halfH = height / 2;
    return `M ${x - halfW} ${y - halfH} L ${x + halfW} ${y - halfH} L ${x + halfW} ${y + halfH} L ${x - halfW} ${y + halfH} Z`;
};

export const generateZonePath = (x: number, y: number, width: number, height: number) => {
    // Same as rectangle, used for zones
    const halfW = width / 2;
    const halfH = height / 2;
    return `M ${x - halfW} ${y - halfH} L ${x + halfW} ${y - halfH} L ${x + halfW} ${y + halfH} L ${x - halfW} ${y + halfH} Z`;
};

export const generateCirclePath = (x: number, y: number, diameter: number) => {
    const r = diameter / 2;
    // Approximating circle with arcs
    return `
        M ${x - r} ${y}
        A ${r} ${r} 0 1 0 ${x + r} ${y}
        A ${r} ${r} 0 1 0 ${x - r} ${y}
    `;
};

export const generateTextPath = (x: number, y: number, text: string, fontSize: number) => {
    // Create an invisible bounding box path for the text to allow selection
    // Approx width estimation: 0.6 * fontSize * charCount
    const width = (text.length * fontSize * 0.6) || 50;
    const height = fontSize || 12;
    const halfW = width / 2;
    const halfH = height / 2;
    
    // Return a rectangular box path centered at x,y
    return `M ${x - halfW} ${y - halfH} L ${x + halfW} ${y - halfH} L ${x + halfW} ${y + halfH} L ${x - halfW} ${y + halfH} Z`;
};


// --- PIPE GENERATOR LOGIC ---
export const generatePipePath = (x: number, y: number, length: number, diameter: number, vertical: boolean = false) => {
    const r = diameter / 2;
    // Curve depth for the "3D" cylindrical look
    const c = r * 0.4; 
    
    if (vertical) {
        // Vertical Pipe with curved ends
        // Top: y - length/2
        // Bottom: y + length/2
        
        // Main Body (Rect)
        // We draw the left side down, curve bottom, right side up, curve top
        const topY = y - length/2;
        const botY = y + length/2;
        
        return `
            M ${x - r} ${topY} 
            L ${x - r} ${botY} 
            Q ${x} ${botY + c} ${x + r} ${botY}
            L ${x + r} ${topY}
            Q ${x} ${topY + c} ${x - r} ${topY}
            Z
            M ${x - r} ${topY}
            Q ${x} ${topY - c} ${x + r} ${topY}
        `;
    } else {
        // Horizontal Pipe
        // Left: x - length/2
        // Right: x + length/2
        
        const leftX = x - length/2;
        const rightX = x + length/2;
        
        return `
            M ${leftX} ${y - r}
            L ${rightX} ${y - r}
            Q ${rightX + c} ${y} ${rightX} ${y + r}
            L ${leftX} ${y + r}
            Q ${leftX + c} ${y} ${leftX} ${y - r}
            Z
            M ${leftX} ${y - r}
            Q ${leftX - c} ${y} ${leftX} ${y + r}
        `;
    }
};

// --- ELBOW GENERATOR LOGIC ---
export const generateElbowPath = (centerX: number, centerY: number, diameter: number, rotation: number) => {
    const r = diameter / 2;
    const R = diameter * 1.5; // Bend Radius (Center to Face) - Standard Long Radius
    const c = r * 0.4; // Curvature for 3D effect (same as pipe)

    // We define the elbow geometry for Rotation 0 (Top to Right) relative to the Corner Intersection (0,0)
    // The "Corner" is where the centerlines of the two pipes intersect.
    
    // Geometry for Rot 0:
    // Input: Vertical down along X=0. Face at Y = -R.
    // Output: Horizontal right along Y=0. Face at X = R.
    // Pivot of Curvature: (R, -R).
    
    // Points relative to Corner (0,0)
    const pTopOuter = { x: -r, y: -R };
    const pTopInner = { x: r, y: -R };
    const pRightInner = { x: R, y: -r };
    const pRightOuter = { x: R, y: r };

    // Radii relative to pivot
    const rInner = R - r;
    const rOuter = R + r;

    // Control points for the "Caps" (Faces) to match pipe curvature
    // Top Face: Horizontal line. Curve should bow Down (Y+) to match vertical pipe bottom.
    const pTopCtrl = { x: 0, y: -R + c }; 
    
    // Right Face: Vertical line. Curve should bow Right (X+) to match horizontal pipe end.
    const pRightCtrl = { x: R + c, y: 0 };

    // Transform function to rotate points around the CenterX/CenterY
    const transform = (p: {x: number, y: number}) => {
        const rad = (rotation * 90) * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        // Rotate
        const rx = p.x * cos - p.y * sin;
        const ry = p.x * sin + p.y * cos;
        
        // Translate
        return { x: centerX + rx, y: centerY + ry };
    };

    // Transform all key points
    const tTopOuter = transform(pTopOuter);
    const tTopInner = transform(pTopInner);
    const tRightInner = transform(pRightInner);
    const tRightOuter = transform(pRightOuter);
    
    const tTopCtrl = transform(pTopCtrl);
    const tRightCtrl = transform(pRightCtrl);

    // SVG Arc Sweep Flags
    // For Rot 0 (Top->Right):
    // Outer Arc: TopOuter to RightOuter. Center is (R, -R). 
    // TopOuter is Left of Center. RightOuter is Below Center.
    // Movement is CCW -> Sweep 0.
    // Inner Arc: RightInner to TopInner. 
    // Movement is CW -> Sweep 1.
    // These flags are invariant under 90deg rotations because the relative geometry rotates together.
    
    return `
        M ${tTopOuter.x} ${tTopOuter.y}
        A ${rOuter} ${rOuter} 0 0 0 ${tRightOuter.x} ${tRightOuter.y}
        Q ${tRightCtrl.x} ${tRightCtrl.y} ${tRightInner.x} ${tRightInner.y}
        A ${rInner} ${rInner} 0 0 1 ${tTopInner.x} ${tTopInner.y}
        Q ${tTopCtrl.x} ${tTopCtrl.y} ${tTopOuter.x} ${tTopOuter.y}
        Z
    `;
};

export const MOCK_SEGMENTS: PipeSegment[] = [
    {
        id: 'SUP-1',
        name: 'Suporte Inicial',
        type: 'SUPPORT',
        x: 400,
        y: 300,
        coordinates: generateRackPath(400, 300, 200, 100), 
        length: '200', 
        weight: '100', 
        description: 'Suporte de Chão Ajustável',
        stages: createDefaultStages()
    }
];
