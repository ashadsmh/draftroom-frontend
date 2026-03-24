import React, { useState, useEffect } from 'react';
import { 
  NbaPlayer, 
  DraftRoomScoreResponse, 
  TrajectoryResponse, 
  getPlayerInfo, 
  getComputedAverages, 
  getDraftRoomScore, 
  getTrajectory 
} from '../api/nba';

interface UsePlayerDataProps {
  selectedPlayer: NbaPlayer | null;
  setSelectedPlayer: React.Dispatch<React.SetStateAction<NbaPlayer | null>>;
  onStatsLoaded?: (stats: any) => void;
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
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<any>(null);
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
        
        try {
          const stats = await getComputedAverages(selectedPlayer.id);
          setSelectedPlayerStats(stats);
          if (onStatsLoaded) onStatsLoaded(stats);
        } catch (err: any) {
          const status = err?.response?.status || 'Unknown Status';
          console.error(`[getComputedAverages] Failed with status ${status}:`, err);
          setSelectedPlayerStats(null);
        } finally {
          setIsLoadingStats(false);
        }

        try {
          const score = await getDraftRoomScore(selectedPlayer.id);
          setSelectedPlayerDraftScore(score);
          if (onScoreLoaded && score) onScoreLoaded(score);
        } catch (err: any) {
          const status = err?.response?.status || 'Unknown Status';
          console.error(`[getDraftRoomScore] Failed with status ${status}:`, err);
          setSelectedPlayerDraftScore(null);
        } finally {
          setIsLoadingDraftScore(false);
        }

        try {
          const traj = await getTrajectory(selectedPlayer.id);
          setSelectedPlayerTrajectory(traj);
          if (onTrajectoryLoaded && traj) onTrajectoryLoaded(traj);
        } catch (err: any) {
          const status = err?.response?.status || 'Unknown Status';
          console.error(`[getTrajectory] Failed with status ${status}:`, err);
          setSelectedPlayerTrajectory(null);
        } finally {
          setIsLoadingTrajectory(false);
        }
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
