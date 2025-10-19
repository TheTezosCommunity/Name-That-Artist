/**
 * Demo script for All-Time Statistics Feature
 * Simulates game data to demonstrate the new statistics tracking
 */

import {
    updatePlayerStats,
    getPlayerStats,
    getLeaderboard
} from '../services/storage.js';

console.log('🎨 Name That Artist - All-Time Statistics Demo\n');
console.log('This script demonstrates the new all-time statistics features.\n');

async function runDemo() {
    console.log('📊 Creating sample game data...\n');
    
    // Simulate multiple players with different stats
    await updatePlayerStats('player1', 'ArtMaster', 450, true, 10, 0);
    await updatePlayerStats('player1', 'ArtMaster', 480, true, 9, 1);
    await updatePlayerStats('player1', 'ArtMaster', 420, false, 8, 2);
    
    await updatePlayerStats('player2', 'QuizWizard', 380, false, 9, 1);
    await updatePlayerStats('player2', 'QuizWizard', 390, false, 8, 2);
    await updatePlayerStats('player2', 'QuizWizard', 400, true, 10, 0);
    await updatePlayerStats('player2', 'QuizWizard', 410, true, 9, 1);
    
    await updatePlayerStats('player3', 'SpeedDemon', 500, true, 7, 3);
    await updatePlayerStats('player3', 'SpeedDemon', 320, false, 6, 4);
    
    await updatePlayerStats('player4', 'Newbie', 200, false, 5, 5);
    
    console.log('✅ Sample data created!\n');
    
    // Display individual player stats
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 INDIVIDUAL PLAYER STATISTICS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const player1 = await getPlayerStats('player1');
    console.log('🏆 ArtMaster:');
    console.log(`   Games Played: ${player1.totalGames}`);
    console.log(`   Wins: ${player1.totalWins}`);
    console.log(`   Total Score: ${player1.totalScore}`);
    console.log(`   Average Score: ${player1.averageScore}`);
    console.log(`   Best Score: ${player1.bestScore}`);
    console.log(`   Correct Answers: ${player1.totalCorrectAnswers}`);
    console.log(`   Incorrect Answers: ${player1.totalIncorrectAnswers}`);
    console.log(`   Accuracy: ${player1.accuracyRate}%`);
    console.log('');
    
    const player2 = await getPlayerStats('player2');
    console.log('🧙 QuizWizard:');
    console.log(`   Games Played: ${player2.totalGames}`);
    console.log(`   Wins: ${player2.totalWins}`);
    console.log(`   Total Score: ${player2.totalScore}`);
    console.log(`   Average Score: ${player2.averageScore}`);
    console.log(`   Best Score: ${player2.bestScore}`);
    console.log(`   Correct Answers: ${player2.totalCorrectAnswers}`);
    console.log(`   Incorrect Answers: ${player2.totalIncorrectAnswers}`);
    console.log(`   Accuracy: ${player2.accuracyRate}%`);
    console.log('');
    
    // Display different leaderboard views
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🏆 ALL-TIME LEADERBOARDS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📈 TOP PLAYERS BY TOTAL SCORE:');
    const scoreBoard = await getLeaderboard('totalScore', 5);
    scoreBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.totalScore} pts`);
    });
    console.log('');
    
    console.log('🏆 TOP PLAYERS BY WINS:');
    const winsBoard = await getLeaderboard('totalWins', 5);
    winsBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.totalWins} wins`);
    });
    console.log('');
    
    console.log('📊 TOP PLAYERS BY AVERAGE SCORE:');
    const avgBoard = await getLeaderboard('averageScore', 5);
    avgBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.averageScore} avg`);
    });
    console.log('');
    
    console.log('⭐ TOP PLAYERS BY BEST SCORE:');
    const bestBoard = await getLeaderboard('bestScore', 5);
    bestBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.bestScore} pts`);
    });
    console.log('');
    
    console.log('🎯 TOP PLAYERS BY ACCURACY:');
    const accuracyBoard = await getLeaderboard('accuracyRate', 5);
    accuracyBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.accuracyRate}% accuracy`);
    });
    console.log('');
    
    console.log('🎮 TOP PLAYERS BY GAMES PLAYED:');
    const gamesBoard = await getLeaderboard('totalGames', 5);
    gamesBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.totalGames} games`);
    });
    console.log('');
    
    console.log('✅ TOP PLAYERS BY CORRECT ANSWERS:');
    const correctBoard = await getLeaderboard('totalCorrectAnswers', 5);
    correctBoard.forEach((player, idx) => {
        console.log(`   ${idx + 1}. ${player.username} - ${player.totalCorrectAnswers} correct`);
    });
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Demo Complete!');
    console.log('═══════════════════════════════════════════════════════════');
}

runDemo().catch(console.error);
