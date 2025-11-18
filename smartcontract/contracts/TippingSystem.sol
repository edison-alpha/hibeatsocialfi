// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TippingSystem is ReentrancyGuard, Ownable(msg.sender) {

    struct Tip {
        uint256 id;
        address tipper;
        address recipient;
        uint256 amount;
        string message;
        uint256 timestamp;
        address tokenAddress; // Address(0) for native token
        uint256 songId; // Optional: tip for specific song
    }

    // State variables
    uint256 private _tipIdCounter;

    mapping(uint256 => Tip) public tips;
    mapping(address => uint256[]) public userReceivedTips; // recipient => tipIds
    mapping(address => uint256[]) public userSentTips; // tipper => tipIds
    mapping(uint256 => uint256[]) public songTips; // songId => tipIds

    // Total tips received by user
    mapping(address => uint256) public totalTipsReceived;

    // Platform fee for tips (in basis points, e.g., 50 = 0.5%)
    uint256 public platformFee = 50;

    // Events
    event TipSent(
        uint256 indexed tipId,
        address indexed tipper,
        address indexed recipient,
        uint256 amount,
        address tokenAddress,
        uint256 songId
    );

    event PlatformFeeUpdated(uint256 newFee);

    constructor() {}

    /**
     * @dev Send a tip in native token
     */
    function sendTip(
        address recipient,
        string memory message,
        uint256 songId
    ) public payable nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value > 0, "Tip amount must be greater than 0");

        _processTip(recipient, msg.value, message, address(0), songId);
    }

    /**
     * @dev Send a tip with ERC20 token (placeholder for future implementation)
     * Note: This would require ERC20 integration
     */
    function sendTipERC20(
        address recipient,
        address tokenAddress,
        uint256 amount,
        string memory message,
        uint256 songId
    ) public nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Tip amount must be greater than 0");

        // TODO: Implement ERC20 transfer logic
        // IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);

        _processTip(recipient, amount, message, tokenAddress, songId);
    }

    /**
     * @dev Internal function to process tip
     */
    function _processTip(
        address recipient,
        uint256 amount,
        string memory message,
        address tokenAddress,
        uint256 songId
    ) internal {
        _tipIdCounter++;
        uint256 tipId = _tipIdCounter;

        // Calculate platform fee
        uint256 fee = (amount * platformFee) / 10000;
        uint256 recipientAmount = amount - fee;

        // Create tip record
        tips[tipId] = Tip({
            id: tipId,
            tipper: msg.sender,
            recipient: recipient,
            amount: recipientAmount, // Store amount after fee
            message: message,
            timestamp: block.timestamp,
            tokenAddress: tokenAddress,
            songId: songId
        });

        // Update mappings
        userSentTips[msg.sender].push(tipId);
        userReceivedTips[recipient].push(tipId);
        totalTipsReceived[recipient] += recipientAmount;

        if (songId > 0) {
            songTips[songId].push(tipId);
        }

        // Transfer to recipient
        payable(recipient).transfer(recipientAmount);

        // Transfer fee to platform
        if (fee > 0) {
            payable(owner()).transfer(fee);
        }

        emit TipSent(tipId, msg.sender, recipient, recipientAmount, tokenAddress, songId);
    }

    /**
     * @dev Withdraw accumulated tips (for future batch withdrawals)
     */
    function withdrawTips() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        payable(owner()).transfer(balance);
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 500, "Fee too high"); // Max 5%
        platformFee = newFee;

        emit PlatformFeeUpdated(newFee);
    }

    /**
     * @dev Get tip details
     */
    function getTip(uint256 tipId) public view returns (Tip memory) {
        require(tips[tipId].id != 0, "Tip does not exist");
        return tips[tipId];
    }

    /**
     * @dev Get tips received by user
     */
    function getUserReceivedTips(address user) public view returns (uint256[] memory) {
        return userReceivedTips[user];
    }

    /**
     * @dev Get tips sent by user
     */
    function getUserSentTips(address user) public view returns (uint256[] memory) {
        return userSentTips[user];
    }

    /**
     * @dev Get tips for a song
     */
    function getSongTips(uint256 songId) public view returns (uint256[] memory) {
        return songTips[songId];
    }

    /**
     * @dev Get total tips received by user
     */
    function getTotalTipsReceived(address user) public view returns (uint256) {
        return totalTipsReceived[user];
    }

    /**
     * @dev Get platform stats
     */
    function getPlatformStats() public view returns (
        uint256 totalTips,
        uint256 totalVolume,
        uint256 platformFeesCollected
    ) {
        totalTips = _tipIdCounter;
        totalVolume = 0;
        platformFeesCollected = 0;

        // Calculate totals (this could be optimized with additional storage)
        for (uint256 i = 1; i <= totalTips; i++) {
            totalVolume += tips[i].amount;
            uint256 originalAmount = (tips[i].amount * 10000) / (10000 - platformFee);
            platformFeesCollected += originalAmount - tips[i].amount;
        }

        return (totalTips, totalVolume, platformFeesCollected);
    }

    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        payable(owner()).transfer(balance);
    }

    // Fallback function to receive native tokens
    receive() external payable {}
}

