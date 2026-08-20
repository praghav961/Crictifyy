import { InningsState, BallEvent } from '../../../lib/scoring/types';

export function getOverByOverData(inningsList: InningsState[], balls: Record<string, BallEvent[]>) {
    const data: any[] = [];
    const maxOvers = Math.max(...inningsList.map(i => i.completedOvers + (i.currentOverBalls > 0 ? 1 : 0)), 1);
    
    for (let over = 1; over <= maxOvers; over++) {
      const row: any = { over: over.toString() };
      
      inningsList.forEach((inning, idx) => {
        const inningBalls = balls[inning.inningId] || [];
        let currentOver = 1;
        let ballsCount = 0;
        
        let runsInOver = 0;
        let cumulativeRuns = 0;
        let wicketsInOver = 0;
        
        for (const b of inningBalls) {
           let legal = (!b.extras || (!b.extras.some(e => e.type === 'WIDE' || e.type === 'NO_BALL')));
           
           let r = b.runs || 0;
           if (b.extras) r += b.extras.reduce((acc, e) => acc + e.runs, 0);
           
           if (currentOver === over) {
               runsInOver += r;
               if (b.wickets) wicketsInOver += b.wickets.length;
           }
           
           if (currentOver <= over) {
               cumulativeRuns += r;
           }
           
           if (legal) {
               ballsCount++;
               if (ballsCount === 6) {
                   currentOver++;
                   ballsCount = 0;
               }
           }
        }
        
        row[`Team${idx + 1}`] = cumulativeRuns;
        row[`Team${idx + 1}_over`] = runsInOver;
        row[`Team${idx + 1}_wickets`] = wicketsInOver;
        
        // Rates
        if (currentOver > over || (currentOver === over && ballsCount > 0)) {
           row[`Team${idx + 1}_crr`] = (cumulativeRuns / over).toFixed(2);
        }
        
        if (inning.targetRuns && inning.maxOvers && over < inning.maxOvers) {
           row[`Team${idx + 1}_rrr`] = ((inning.targetRuns - cumulativeRuns) / (inning.maxOvers - over)).toFixed(2);
        }
      });
      data.push(row);
    }
    return data;
}

export function getPartnershipsData(balls: BallEvent[]) {
    const partnerships: any[] = [];
    let currentPartnershipRuns = 0;
    let pBalls = 0;
    
    let wNum = 1;
    for (const b of balls) {
        let r = b.runs || 0;
        if (b.extras) r += b.extras.reduce((acc, e) => acc + e.runs, 0);
        currentPartnershipRuns += r;
        pBalls++;
        
        if (b.wickets && b.wickets.length > 0) {
            partnerships.push({
                name: `Wkt ${wNum}`,
                runs: currentPartnershipRuns,
                balls: pBalls
            });
            wNum++;
            currentPartnershipRuns = 0;
            pBalls = 0;
        }
    }
    if (pBalls > 0 || currentPartnershipRuns > 0) {
        partnerships.push({
            name: `Current*`,
            runs: currentPartnershipRuns,
            balls: pBalls
        });
    }
    return partnerships;
}

export function getBoundaryData(balls: BallEvent[]) {
    let fours = 0;
    let sixes = 0;
    let ones = 0;
    let twos = 0;
    let threes = 0;
    let dots = 0;
    
    for (const b of balls) {
        if (b.isBoundary && b.boundaryType === 'FOUR') fours++;
        else if (b.isBoundary && b.boundaryType === 'SIX') sixes++;
        else if (b.runs === 1) ones++;
        else if (b.runs === 2) twos++;
        else if (b.runs === 3) threes++;
        else if (b.runs === 0 && (!b.extras || !b.extras.some(e => e.type === 'WIDE' || e.type === 'NO_BALL'))) dots++;
    }
    
    return [
        { name: 'Dots', value: dots },
        { name: '1s', value: ones },
        { name: '2s', value: twos },
        { name: '3s', value: threes },
        { name: '4s', value: fours },
        { name: '6s', value: sixes },
    ];
}

export function getBowlingAnalysisData(inning: InningsState) {
    if (!inning || !inning.bowlerStats) return [];
    const bowlers = Object.values(inning.bowlerStats);
    return bowlers.map(b => {
        return {
            name: b.id.replace('temp_', '').replace(/_/g, ' '),
            dots: b.dots,
            runsConceded: b.runs,
            wickets: b.wickets,
            overs: b.overs + (b.balls / 6)
        };
    });
}
