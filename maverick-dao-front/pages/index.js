import { useState, useEffect, useRef } from 'react' 
import { Contract, providers} from 'ethers'
import { formatEther } from 'ethers/lib/utils'

import Web3Modal from "web3modal"
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { MAVERICKS_NFT_CONTRACT_ADDRESS, MAVERICKS_NFT_CONTRACT_ABI, MAVERICK_DAO_CONTRACT_ADDRESS, MAVERICK_DAO_CONTRACT_ABI } from '../constants'

export default function Home() {
  
  //balance of DAO contract
  const [treasuryBalance, setTreasuryBalance] = useState("0")

  const [numProposals, setNumProposals] = useState("0")


  const [proposals, setProposals] = useState([])

  const [userNftBalance, setUserNftBalance] = useState(0)

  const  [pseudoNftTokenId, setPseudoNftTokenId] = useState("")

  const [selectedTab, setSelectedTab] = useState("")

  const [loading, setLoading] = useState(false)

  const [walletConnected, setWalletConnected] = useState(false)

  const web3ModalRef = useRef()



  //helper functions  for contract instance

  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(
      MAVERICK_DAO_CONTRACT_ADDRESS,
      MAVERICK_DAO_CONTRACT_ABI,
      providerOrSigner
    )
  }

  const getMavericksNFTContractInstance = (providerOrSigner) => {
    return new Contract(
      MAVERICKS_NFT_CONTRACT_ADDRESS,
      MAVERICKS_NFT_CONTRACT_ABI,
      providerOrSigner
    )
  }

  
  const getProviderOrSigner = async(needSigner = false) => {
    const provider = await web3ModalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const { chainId } = await web3Provider.getNetwork()
    if ( chainId !== 4 ) {
      window.alert("Please switch to the Rinkeby network!")
      throw new Error("Please switch to the Rinkeby network")
    }

    if(needSigner) {
      const signer =  web3Provider.getSigner()
      return signer
    }
    return web3Provider
  }


  const connectWallet = async () => {
      try {
        await getProviderOrSigner()
        setWalletConnected(true)
      } catch (err) {
        console.log(err)
      }
  }


  const getDAOTreasuryBalance = async () => {
      try {
        const provider = await getProviderOrSigner()
        const balance = await provider.getBalance(MAVERICK_DAO_CONTRACT_ADDRESS)
        setTreasuryBalance(balance.toString())
      } catch (err) {
        console.error(err)
      }
  }

  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner()

      const contract = getDaoContractInstance(provider)
      const daoNumProposals = await contract.noOfProposals()
      setNumProposals(daoNumProposals.toString())
    } catch(err) {
      console.error(err)
    }
  }
  
  const getUserNFTBalance = async () => {
    try {
        const signer = await getProviderOrSigner(true)
        const nftContract = getMavericksNFTContractInstance(signer)
        const balance = await  nftContract.balanceOf(signer.getAddress())
        setUserNftBalance(parseInt(balance.toString()))
    } catch (err) {
      console.log(err)
    }
  }

  const makeProposal = async () => {
    try{ 
      const signer = await getProviderOrSigner(true)
      const daoContract = getDaoContractInstance(signer)
      const txn = await daoContract.makeProposal(pseudoNftTokenId)
      setLoading(true)
      await txn.wait()
      await getNumProposalsInDAO()
      setLoading(false)
    } catch(err) {
      console.error(err)
      window.alert(err.data.message)
    }
  }


  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner()
      const daoContract = getDaoContractInstance(provider)
      const proposal = await daoContract.proposals(id)
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        votesFor: proposal.votesFor.toString(),
        votesAgainst: proposal.votesAgainst.toString(),
        executed: proposal.executed,
      }
      return parsedProposal
    } catch(err) {
      console.error(err)
    }
  }


  const fetchAllProposals = async () => {
    try {
        const proposals = []
        for (let i = 0; i < numProposals; i++) {
          const proposal = await fetchProposalById(i)
          proposals.push(proposal)
        }
        setProposals((proposals))
        return proposals
        // console.log(proposals)
    } catch(err) {
      console.error(err)
    }
  }


  const voteOnProposal = async(proposalId, _vote) => {
    try{ 
      const signer = await getProviderOrSigner(true)
      const daoContract = getDaoContractInstance(signer)
       
      let vote = _vote === "OUI" ? 0: 1
      const txn = await daoContract.voteOnProposal(proposalId, vote)
      setLoading(true)
      await txn.wait()
      setLoading(false)
      await fetchAllProposals()
    } catch(err) {
      console.error(err)
    }
  }

  const executeProposal = async (proposalId) => {
    try{
      const signer = await getProviderOrSigner(true)
      const daoContract = getDaoContractInstance(signer)
      const txn = await daoContract.executeProposal(proposalId)
      setLoading(true)
      await txn.wait()
      setLoading(false)
      await fetchAllProposals()
    } catch(err) {
      console.log(err)
      window.alert("Something went wrong...")
    }
  }


  useEffect(() => {
    if(!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false
      })

      connectWallet().then(() => {
        getDAOTreasuryBalance()
        getUserNFTBalance()
        getNumProposalsInDAO()
      })
    }
  }, [walletConnected]) 


  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals()
    }
  }, [selectedTab])



  function renderTabs() {
    if (selectedTab === "Make a Proposal") {
      return renderCreateProposalTab()
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab()
    }
    return null
  }




  const renderCreateProposalTab = () => {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading🎁... Waiting for transaction
        </div>
      )
    } else if (userNftBalance === 0) {
      return (
        <div className={styles.description}>
        You do not own any Mavericks NFTs. <br />
        <b>You cannot create or vote on proposals</b>
      </div>
      )
    } else {
      return (
        <div className={styles.container}>
        <label>Pseudo NFT Token ID to Purchase: </label>
        <input
        style={{  outline: "none",
          padding: "10px" }}
          placeholder="0"
          type="number"
          onChange={(e) => setPseudoNftTokenId(e.target.value)}
        />
        <button className={styles.button2} onClick={makeProposal}>
          Create
        </button>
      </div>
      )
    }
  }

  // Renders the 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading🎁... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>
          No proposals have been made
        </div>
      );
    } else {
      return (
        <div className={styles.cardContainer}>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Pseudo NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Votes For: {p.votesFor}</p>
              <p>Votes Against: {p.votesAgainst}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "OUI")}
                  >
                    Vote For
                  </button>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "NON")}
                  >
                    Vote Against
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.votesFor > p.votesAgainst ? "(YES)" : "(NO)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }






 

  return (
    <div>
      <Head>
        <title>Mavericks DAO</title>
        <meta name='description' content='MavericksDAO' />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
      <div>
      <h1 className={styles.title}>Welcome to Mavericks Chain!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your Maverick NFT Balance: {userNftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
            className={styles.button}
            onClick={() => setSelectedTab("Make a Proposal")}
            >
              Make a Proposal
            </button>
            <button
            className={styles.button}
            onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
          </div>
          {renderTabs()}
      </div>
    <div>
    <img className={styles.image} src="/onboard.jpg" />
    </div>
      </div>

    
      <footer className={styles.footer}>
        Made with &#10084; by Bellz
      </footer>
    </div>
  )
}
