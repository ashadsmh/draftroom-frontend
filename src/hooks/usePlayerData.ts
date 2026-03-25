import React, { useState, useEffect } from 'react';
import { 
  NbaPlayer, 
  DraftRoomScoreResponse, 
  TrajectoryResponse, 
  ComputedStats,
  getPlayerInfo, 
  getComputedAverages, 
  getDraftRoomScore, 
  getTrajectory 
} from '../api/nba';

interface UsePlayerDataProps {
  selectedPlayer: NbaPlayer | null;
  setSelectedPlayer: React.Dispatch<React.SetStateAction<NbaPlayer | null>>;
  onStatsLoaded?: (stats: ComputedStats) => void;
  onScoreLoaded?: (score: DraftRoomScoreResponse) => void;
  onTrajectoryLoaded?: (traj: TrajectoryResponse) => void;
}

export function usePlayerData({
  selectedPlayer,
  setSelectedPlayer,
  onStatsLoaded,
  onScoreLoaded,
  onTrajectoryLoaded
}: UsePlayerDataProps) {
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<ComputedStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedPlayerDraftScore, setSelectedPlayerDraftScore] = useState<DraftRoomScoreResponse | null>(null);
  const [isLoadingDraftScore, setIsLoadingDraftScore] = useState(false);
  const [selectedPlayerTrajectory, setSelectedPlayerTrajectory] = useState<TrajectoryResponse | null>(null);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState(false);

  useEffect(() => {
    if (selectedPlayer) {
      setIsLoadingStats(true);
      setIsLoadingDraftScore(true);
      setIsLoadingTrajectory(true);

      const fetchPlayerData = async () => {
        if (!selectedPlayer.position || selectedPlayer.team.full_name === 'NBA') {
          try {
            const info = await getPlayerInfo(selectedPlayer.id);
            if (info && info.CommonPlayerInfo && info.CommonPlayerInfo.length > 0) {
              const pInfo = info.CommonPlayerInfo[0];
              setSelectedPlayer(prev => prev ? { 
                ...prev, 
                position: pInfo.POSITION,
                team: { full_name: `${pInfo.TEAM_CITY} ${pInfo.TEAM_NAME}`.trim() }
              } : prev);
            }
          } catch (err) {
            console.error(err);
          }
        }
        
        const [statsResult, scoreResult, trajResult] = await Promise.allSettled([
          getComputedAverages(selectedPlayer.id),
          getDraftRoomScore(selectedPlayer.id),
          getTrajectory(selectedPlayer.id)
        ]);

        if (statsResult.status === 'fulfilled') {
          setSelectedPlayerStats(statsResult.value);
          if (onStatsLoaded) onStatsLoaded(statsResult.value);
        } else {
          const err = statsResult.reason;
          const status = (err as any)?.response?.status || 'Unknown Status';
          console.error(`[getComputedAverages] Failed with status ${status}:`, err);
          setSelectedPlayerStats(null);
        }
        setIsLoadingStats(false);

        if (scoreResult.status === 'fulfilled') {
          setSelectedPlayerDraftScore(scoreResult.value);
          if (onScoreLoaded && scoreResult.value) onScoreLoaded(scoreResult.value);
        } else {
          const err = scoreResult.reason;
          const status = (err as any)?.response?.status || 'Unknown Status';
          console.error(`[getDraftRoomScore] Failed with status ${status}:`, err);
          setSelectedPlayerDraftScore(null);
        }
        setIsLoadingDraftScore(false);

        if (trajResult.status === 'fulfilled') {
          setSelectedPlayerTrajectory(trajResult.value);
          if (onTrajectoryLoaded && trajResult.value) onTrajectoryLoaded(trajResult.value);
        } else {
          const err = trajResult.reason;
          const status = (err as any)?.response?.status || 'Unknown Status';
          console.error(`[getTrajectory] Failed with status ${status}:`, err);
          setSelectedPlayerTrajectory(null);
        }
        setIsLoadingTrajectory(false);
      };

      fetchPlayerData();
    } else {
      setSelectedPlayerStats(null);
      setSelectedPlayerDraftScore(null);
      setSelectedPlayerTrajectory(null);
    }
  }, [selectedPlayer]);

  return {
    selectedPlayerStats,
    isLoadingStats,
    selectedPlayerDraftScore,
    isLoadingDraftScore,
    selectedPlayerTrajectory,
    isLoadingTrajectory
  };
}
