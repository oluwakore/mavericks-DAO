const { ethers } = require('hardhat')
const { MAVERICKS_NFT_CONTRACT_ADDRESS  } = require('../constants')


async function main() {
  const PseudoNFTMarketplace = await ethers.getContractFactory("PseudoNFTMarketplace")

  const pseudoNFTMarketplace = await PseudoNFTMarketplace.deploy()

  await pseudoNFTMarketplace.deployed()

  console.log("PseudoNFTMarketplace deployed to:", pseudoNFTMarketplace.address)



  const MaverickDAO = await ethers.getContractFactory("MaverickDAO")

  const maverickDAO = await MaverickDAO.deploy(pseudoNFTMarketplace.address, MAVERICKS_NFT_CONTRACT_ADDRESS,
    {
      //assumes of existence of eth in the account
      value: ethers.utils.parseEther("0.5")
    }
    )

  await maverickDAO.deployed()

  console.log("MaverickDAO deployed to:", maverickDAO.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })