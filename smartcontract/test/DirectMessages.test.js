const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DirectMessages", function () {
  let directMessages;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const DirectMessages = await ethers.getContractFactory("DirectMessages");
    directMessages = await DirectMessages.deploy();
    await directMessages.waitForDeployment();
  });

  describe("Message Sending", function () {
    it("Should send a message successfully", async function () {
      const message = "Hello, this is a test message!";

      const tx = await directMessages.connect(user1).sendMessage(
        user2.address,
        message,
        "",
        0
      );

      await expect(tx)
        .to.emit(directMessages, "MessageSent")
        .withArgs(1, user1.address, user2.address, 1);

      // Check message details
      const messageData = await directMessages.connect(user1).getMessage(1);
      expect(messageData.sender).to.equal(user1.address);
      expect(messageData.receiver).to.equal(user2.address);
      expect(messageData.content).to.equal(message);
      expect(messageData.isRead).to.equal(false);
    });

    it("Should create conversation automatically", async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "First message",
        "",
        0
      );

      const conversationId = await directMessages.getConversationBetweenUsers(
        user1.address,
        user2.address
      );

      expect(conversationId).to.equal(1);

      const conversation = await directMessages.connect(user1).getConversation(1);
      expect(conversation.participant1).to.equal(user1.address);
      expect(conversation.participant2).to.equal(user2.address);
      expect(conversation.messageCount).to.equal(1);
    });

    it("Should not allow sending message to self", async function () {
      await expect(
        directMessages.connect(user1).sendMessage(
          user1.address,
          "Message to self",
          "",
          0
        )
      ).to.be.revertedWith("Cannot send message to yourself");
    });

    it("Should not allow empty messages", async function () {
      await expect(
        directMessages.connect(user1).sendMessage(
          user2.address,
          "",
          "",
          0
        )
      ).to.be.revertedWith("Message cannot be empty");
    });
  });

  describe("Message Reading", function () {
    beforeEach(async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Test message",
        "",
        0
      );
    });

    it("Should mark message as read", async function () {
      await expect(directMessages.connect(user2).markMessageAsRead(1))
        .to.emit(directMessages, "MessageRead")
        .withArgs(1, user2.address);

      const messageData = await directMessages.connect(user2).getMessage(1);
      expect(messageData.isRead).to.equal(true);
    });

    it("Should only allow receiver to mark as read", async function () {
      await expect(
        directMessages.connect(user1).markMessageAsRead(1)
      ).to.be.revertedWith("Not the receiver");

      await expect(
        directMessages.connect(user3).markMessageAsRead(1)
      ).to.be.revertedWith("Not the receiver");
    });

    it("Should mark conversation as read", async function () {
      // Send another message
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Second message",
        "",
        0
      );

      await directMessages.connect(user2).markConversationAsRead(1);

      const message1 = await directMessages.connect(user2).getMessage(1);
      const message2 = await directMessages.connect(user2).getMessage(2);

      expect(message1.isRead).to.equal(true);
      expect(message2.isRead).to.equal(true);
    });
  });

  describe("Message Deletion", function () {
    beforeEach(async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Test message",
        "",
        0
      );
    });

    it("Should allow sender to delete message", async function () {
      await directMessages.connect(user1).deleteMessage(1);

      const messageData = await directMessages.connect(user1).getMessage(1);
      expect(messageData.isDeleted).to.equal(true);
    });

    it("Should not allow others to delete message", async function () {
      await expect(
        directMessages.connect(user2).deleteMessage(1)
      ).to.be.revertedWith("Only sender can delete");

      await expect(
        directMessages.connect(user3).deleteMessage(1)
      ).to.be.revertedWith("Only sender can delete");
    });
  });

  describe("Conversation Management", function () {
    it("Should get conversation messages", async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Message 1",
        "",
        0
      );

      await directMessages.connect(user2).sendMessage(
        user1.address,
        "Message 2",
        "",
        0
      );

      const messageIds = await directMessages.connect(user1).getConversationMessages(1);
      expect(messageIds.length).to.equal(2);
      expect(messageIds[0]).to.equal(1);
      expect(messageIds[1]).to.equal(2);
    });

    it("Should get user conversations", async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "To user2",
        "",
        0
      );

      await directMessages.connect(user1).sendMessage(
        user3.address,
        "To user3",
        "",
        0
      );

      const user1Conversations = await directMessages.getUserConversations(user1.address);
      expect(user1Conversations.length).to.equal(2);
    });

    it("Should reuse existing conversation", async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "First message",
        "",
        0
      );

      await directMessages.connect(user2).sendMessage(
        user1.address,
        "Reply",
        "",
        0
      );

      const conversationId1 = await directMessages.getConversationBetweenUsers(
        user1.address,
        user2.address
      );

      const conversationId2 = await directMessages.getConversationBetweenUsers(
        user2.address,
        user1.address
      );

      expect(conversationId1).to.equal(conversationId2);
      expect(conversationId1).to.equal(1);
    });
  });

  describe("Reply Functionality", function () {
    it("Should handle message replies", async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Original message",
        "",
        0
      );

      await directMessages.connect(user2).sendMessage(
        user1.address,
        "This is a reply",
        "",
        1
      );

      const replyMessage = await directMessages.connect(user1).getMessage(2);
      expect(replyMessage.replyTo).to.equal(1);
    });
  });

  describe("Unread Count", function () {
    it("Should track unread messages correctly", async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Message 1",
        "",
        0
      );

      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Message 2",
        "",
        0
      );

      let unreadCount = await directMessages.getUnreadMessageCount(user2.address);
      expect(unreadCount).to.equal(2);

      await directMessages.connect(user2).markMessageAsRead(1);

      unreadCount = await directMessages.getUnreadMessageCount(user2.address);
      expect(unreadCount).to.equal(1);
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Private message",
        "",
        0
      );
    });

    it("Should only allow conversation participants to view messages", async function () {
      // user1 and user2 should be able to view
      await directMessages.connect(user1).getMessage(1);
      await directMessages.connect(user2).getMessage(1);

      // user3 should not be able to view
      await expect(
        directMessages.connect(user3).getMessage(1)
      ).to.be.revertedWith("Not authorized to view message");
    });

    it("Should only allow participants to view conversation", async function () {
      await directMessages.connect(user1).getConversation(1);
      await directMessages.connect(user2).getConversation(1);

      await expect(
        directMessages.connect(user3).getConversation(1)
      ).to.be.revertedWith("Not a participant");
    });
  });

  describe("IPFS Attachments", function () {
    it("Should handle messages with IPFS attachments", async function () {
      const ipfsHash = "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7";

      await directMessages.connect(user1).sendMessage(
        user2.address,
        "Check this attachment",
        ipfsHash,
        0
      );

      const messageData = await directMessages.connect(user1).getMessage(1);
      expect(messageData.ipfsHash).to.equal(ipfsHash);
    });
  });
});